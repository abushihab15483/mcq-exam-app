-- ============================================
-- Step 16 — Hard 8PM cutoff + frozen pre-deadline answer snapshot
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (step14 এর পরে,
-- একবারই)। এটা step13/step14 এর request_submission()/submit_attempt() কে
-- replace করে।
--
-- ============================================
-- Root cause (Issue #9 এর অংশ হিসেবে audit করে পাওয়া বাগ)
-- ============================================
-- step13/step14 এর "technical finalization buffer" শুধু evidence হিসেবে একটা
-- TIMESTAMP রাখতো (attempts.submission_requested_at) — কোন answers সেই
-- মুহূর্তে ছিল সেটা কখনো রেকর্ড হতো না। submit_attempt() এর buffer window এ
-- (deadline পার হওয়ার পর ২০ সেকেন্ড পর্যন্ত) client তখনও নতুন p_answers
-- payload পাঠাতে পারতো, আর RPC সরাসরি সেটাই লিখে scoring করতো — buffer শুধু
-- "কেউ deadline এর আগে submit করার চেষ্টা করেছিল" চেক করতো, "কোন answers এ
-- সেই চেষ্টা ছিল" চেক করতো না।
--
-- ফলে বাস্তবে: student ৭:৫৯:৫৯-এ Submit চাপল (ping/intent রেকর্ড হলো), কিন্তু
-- ব্রাউজার/নেটওয়ার্ক দেরির কারণে আসল answers payload পৌঁছালো ৮:০০:১০-এ —
-- এই ১১ সেকেন্ডে student এর UI তে (যদি এখনও responsive থাকে) উত্তর বদলানো
-- সম্ভব ছিল, আর RPC সেই বদলানো উত্তরই accept করে ফেলতো। এটা master prompt এর
-- absolute requirement ভঙ্গ করে: "৮টার পরে কোনো নতুন answer/answer
-- modification গ্রহণ করা যাবে না" — buffer শুধু transport delay শোষণ করার
-- কথা, নতুন decision-time দেওয়ার কথা না।
--
-- ============================================
-- Fix: snapshot-based finalization
-- ============================================
-- এখন থেকে "evidence" মানে শুধু একটা timestamp না — deadline এর ঠিক আগে
-- client এর answers এর একটা FROZEN COPY। এই snapshot একবার deadline পার হয়ে
-- গেলে আর কখনো বদলানো/overwrite হয় না। Buffer window এ finalize করলে এই
-- frozen snapshot ই ব্যবহার হয় — সেই মুহূর্তে client যা পাঠাচ্ছে সেটা না।
--
--   request_submission(attempt_id, answers)  [Layer 1 — Submit ক্লিক/
--   auto-submit timer/pagehide beacon প্রতিটাতেই ডাকা হয়, দেখো
--   lib/submitIntent.ts, app/(public)/exam/[examId]/page.tsx]
--     -> deadline এর আগে হলে: submission_requested_at (প্রথমবার, audit
--        evidence হিসেবে) + frozen_answers/frozen_answers_at (প্রতিবার,
--        সবসময় latest pre-deadline অবস্থা) আপডেট হয়।
--     -> deadline পার হয়ে গেলে: কিচ্ছু লেখা হয় না, 'deadline_passed'।
--
--   submit_attempt(attempt_id, answers)      [Layer 2 — আসল write/score]
--     -> now <= deadline: স্বাভাবিক পথ, client এর এই মুহূর্তের answers ই
--        ব্যবহার হয় (এটাই সবচেয়ে up-to-date, কোনো buffer লাগেই না)।
--     -> now > deadline কিন্তু frozen_answers_at + buffer এর ভিতরে: client এর
--        এই call এর p_answers সম্পূর্ণ IGNORE করা হয় — শুধু আগে থেকে freeze
--        করা frozen_answers দিয়ে score/insert হয়। Buffer শুধু DB
--        transaction সম্পূর্ণ করার সময় দেয়, নতুন কোনো data গ্রহণ করে না।
--     -> অন্য সব ক্ষেত্রে (কোনো frozen snapshot নেই, বা buffer ও পার হয়ে
--        গেছে): genuinely late, 'deadline_passed', কিছুই লেখা হয় না।
--
-- Race-safe: দুটো function ই শুরুতেই `for update` row lock নেয় (step9/13
-- থেকে অপরিবর্তিত প্যাটার্ন), তাই একই attempt এ concurrent
-- request_submission + submit_attempt কল এলে একটা অন্যটার কমিট/রোলব্যাক না
-- হওয়া পর্যন্ত অপেক্ষা করে — frozen_answers আর submitted_at এর মধ্যে কোনো
-- torn/interleaved state তৈরি হতে পারে না।
-- ============================================

alter table attempts
  add column if not exists submission_requested_at timestamptz;

-- শুধু audit/debugging evidence হিসেবে রাখা হচ্ছে — client পাঠানো এই timestamp
-- কখনোই deadline/buffer সিদ্ধান্তে ব্যবহার হয় না (evidence, না authority)।
alter table attempts
  add column if not exists client_submit_intent_at timestamptz;

-- নতুন: deadline এর ঠিক আগে capture করা answers এর frozen snapshot, আর সেটা
-- কখন capture হয়েছিল (DB এর নিজের ঘড়ি দিয়ে) — buffer window এর হিসাব এই
-- কলাম থেকেই হয়, submission_requested_at থেকে না (ওটা শুধু earliest-intent
-- audit trail হিসেবে থেকে যাচ্ছে, কিন্তু আর finalize-decision এ ব্যবহার হয় না)।
alter table attempts
  add column if not exists frozen_answers jsonb;

alter table attempts
  add column if not exists frozen_answers_at timestamptz;

create index if not exists idx_attempts_submission_requested_at
  on attempts (submission_requested_at)
  where submission_requested_at is not null;

-- কতক্ষণ পর্যন্ত একটা frozen pre-deadline snapshot এর ভিত্তিতে finalize করা
-- যাবে — শুধু network/processing এর transit latency শোষণ করার জন্য। এই
-- window এর ভিতরেও client এর তখনকার payload কখনো ব্যবহার হয় না, শুধু
-- frozen_answers।
-- ============================================

-- ধাপ ১: pre-deadline intent + snapshot ping। ছোট/দ্রুত, বারবার (idempotent)
-- কল করা নিরাপদ — Submit ক্লিক, pre-deadline auto-submit timer, বা pagehide
-- beacon, যেকোনোটা deadline এর আগে সার্ভারে পৌঁছালেই যথেষ্ট। প্রতিবার
-- deadline এর আগে কল হলে frozen_answers সবচেয়ে সাম্প্রতিক অবস্থায় update
-- হয় — যাতে student এর সর্বশেষ উত্তরই snapshot এ থাকে, কোনো পুরনো অবস্থা না।
create or replace function request_submission(
  p_attempt_id uuid,
  p_answers jsonb default null,          -- jsonb array: [{"question_id": "...", "selected_option": "A"}, ...]
  p_client_submitted_at timestamptz default null
)
returns jsonb
language plpgsql
as $$
declare
  v_attempt attempts%rowtype;
  v_exam exams%rowtype;
  v_deadline timestamptz;
  v_now timestamptz := clock_timestamp(); -- DB এর নিজের ঘড়ি — কখনো client/app-server clock না
begin
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.submitted_at is not null then
    -- আগেই finalize হয়ে গেছে — ping এর আর কোনো কাজ নেই, idempotent success
    return jsonb_build_object('status', 'already_submitted');
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- exam.status published না হলে (admin বন্ধ করে দিয়েছে) — deadline এখনো
  -- ভবিষ্যতে থাকলেও কোনো নতুন intent/snapshot রেকর্ড করা হবে না (step14 এর
  -- আচরণ অক্ষত)।
  if found and v_exam.status is distinct from 'published' then
    return jsonb_build_object('status', 'exam_closed');
  end if;

  if found then
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  if v_deadline is not null and v_now > v_deadline then
    -- ৮টার hard cutoff — deadline পার হয়ে যাওয়ার পরে আসা কোনো ping/intent/
    -- snapshot গ্রহণ করা হবে না, আগে থেকেই কিছু রেকর্ড করা থাকলেও সেটা
    -- বদলানো হবে না (নিচে এই branch এ কোনো UPDATE নেই)। genuinely late
    -- হিসেবেই থাকবে।
    return jsonb_build_object('status', 'deadline_passed');
  end if;

  -- এখনো deadline এর আগে/সমান — এটাই safe, "৮টার হার্ড কাটঅফের আগ পর্যন্ত"
  -- সময়। submission_requested_at শুধু প্রথমবার সেট হয় (earliest-intent audit
  -- evidence), কিন্তু frozen_answers/frozen_answers_at প্রতিবার update হয় যদি
  -- caller answers পাঠায় — কারণ আমরা সবসময় সবচেয়ে latest pre-deadline
  -- অবস্থাটাই freeze করে রাখতে চাই, প্রথমটা না।
  update attempts
    set submission_requested_at = coalesce(v_attempt.submission_requested_at, v_now),
        client_submit_intent_at = coalesce(p_client_submitted_at, client_submit_intent_at),
        frozen_answers = case when p_answers is not null then p_answers else frozen_answers end,
        frozen_answers_at = case when p_answers is not null then v_now else frozen_answers_at end
    where id = p_attempt_id;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- ধাপ ২: submit_attempt — score এখনো সম্পূর্ণ DB-এর ভিতরেই গণনা হয়, বাইরে
-- থেকে কোনো score/total আসে না (step9/10 এর security অপরিবর্তিত)। এখন থেকে
-- deadline পার হয়ে যাওয়ার পরে p_answers কখনো ব্যবহার হয় না — শুধু
-- request_submission() দিয়ে আগে থেকে freeze করা snapshot ব্যবহার হয়।
create or replace function submit_attempt(
  p_attempt_id uuid,
  p_answers jsonb             -- jsonb array: [{"question_id": "...", "selected_option": "A"}, ...]
)
returns jsonb
language plpgsql
as $$
declare
  v_attempt attempts%rowtype;
  v_exam exams%rowtype;
  v_deadline timestamptz;
  v_now timestamptz := clock_timestamp(); -- DB এর নিজের ঘড়ি — client/app-server clock কখনো না
  v_submitted_at timestamptz;
  v_score integer;
  v_total integer;
  v_finalize_buffer constant interval := interval '20 seconds';
  v_within_buffer boolean := false;
  v_answers_to_use jsonb;
begin
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Idempotency আগে (status/deadline check এরও আগে) — attempt আগেই finalize
  -- হয়ে থাকলে existing result স্বাভাবিকভাবে ফেরত যাবে, exam পরে বন্ধ হয়ে
  -- গেলেও।
  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'status', 'already_submitted',
      'submitted_at', v_attempt.submitted_at,
      'score', v_attempt.score,
      'total', v_attempt.total_questions
    );
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- Authoritative closure check — admin বন্ধ করে দিলে attempt এর নিজের
  -- deadline এখনো ভবিষ্যতে থাকলেও, কোনো buffer/frozen snapshot থাকলেও, কোনো
  -- নতুন submission finalize হবে না (step14 এর আচরণ অক্ষত)।
  if found and v_exam.status is distinct from 'published' then
    return jsonb_build_object('status', 'exam_closed');
  end if;

  if found then
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  if v_deadline is not null and v_now > v_deadline then
    -- ৮টার hard cutoff পার হয়ে গেছে — সরাসরি reject না করে আগে দেখো এই
    -- attempt এর জন্য deadline এর আগেই কোনো frozen snapshot capture হয়ে
    -- আছে কিনা (request_submission দিয়ে), আর সেটা এখনো buffer window এর
    -- ভিতরে কিনা।
    if v_attempt.frozen_answers_at is not null
       and v_now <= v_attempt.frozen_answers_at + v_finalize_buffer then
      v_within_buffer := true;
      -- *** Critical: এই মুহূর্তে client এর পাঠানো p_answers সম্পূর্ণ
      -- ignore করা হচ্ছে — শুধু আগে freeze করা snapshot ব্যবহার হবে। এটাই
      -- মূল fix: buffer কখনো "নতুন answers accept করো" বোঝায় না, শুধু
      -- "আগেই capture করা answers finalize করার জন্য কিছুটা বাড়তি সময়"
      -- বোঝায়।
      v_answers_to_use := v_attempt.frozen_answers;
    end if;

    if not v_within_buffer then
      -- কোনো pre-deadline frozen evidence নেই, বা buffer window ও পার হয়ে
      -- গেছে — genuinely late first submission, সত্যিকারের reject, কোনো
      -- score/answers লেখা হয়নি।
      return jsonb_build_object('status', 'deadline_passed', 'deadline', v_deadline);
    end if;
  else
    -- এখনো deadline এর আগে/সমান — এটাই স্বাভাবিক সময়মতো submit, client এর
    -- এই মুহূর্তের answers ই সবচেয়ে up-to-date, সরাসরি সেটাই ব্যবহার হবে।
    -- কোনো buffer/snapshot লাগেই না।
    v_answers_to_use := p_answers;
    if v_attempt.submission_requested_at is null then
      update attempts set submission_requested_at = v_now where id = p_attempt_id;
    end if;
  end if;

  v_submitted_at := v_now;

  insert into answers (attempt_id, question_id, selected_option)
  select
    p_attempt_id,
    (elem->>'question_id')::uuid,
    elem->>'selected_option'
  from jsonb_array_elements(coalesce(v_answers_to_use, '[]'::jsonb)) as elem
  where elem->>'selected_option' is not null
    and exists (
      select 1 from questions q
      where q.id = (elem->>'question_id')::uuid
        and q.exam_id = v_attempt.exam_id
    )
  on conflict (attempt_id, question_id)
  do update set selected_option = excluded.selected_option;

  select count(*) into v_total from questions where exam_id = v_attempt.exam_id;

  select count(*) into v_score
  from answers a
  join questions q on q.id = a.question_id
  where a.attempt_id = p_attempt_id and a.selected_option = q.correct_option;

  update attempts
    set submitted_at = v_submitted_at,
        score = v_score,
        total_questions = v_total
    where id = p_attempt_id;

  return jsonb_build_object('status', 'success', 'submitted_at', v_submitted_at, 'used_buffer', v_within_buffer);
end;
$$;

-- service_role client (আমাদের /app/api/submit, /app/api/submit/intent route)
-- থেকেই কল হবে, RLS bypass করে — আলাদা GRANT/policy দরকার নেই (step9/10 থেকে অপরিবর্তিত)।
