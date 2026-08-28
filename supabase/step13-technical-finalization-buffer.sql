-- ============================================
-- Step 13 — Technical finalization buffer for near-deadline submissions
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (step10 এর পরে,
-- একবারই)।
--
-- সমস্যা (production bug report):
-- Student এর ১০–৩০ সেকেন্ড বাকি থাকতে Submit ক্লিক করে, কিন্তু শেয়ার্ড ল্যাবের
-- unstable connectivity এর কারণে request সার্ভারে পৌঁছাতে দেরি হয় — ততক্ষণে
-- DB clock deadline পার হয়ে গেছে, তাই step10 এর জিরো-গ্রেস RPC এটা reject
-- করে। Legitimate submission permanently হারিয়ে যায়।
--
-- এই migration একটা blanket "deadline_passed হলেও ৩০ সেকেন্ড accept করো" grace
-- period **না** — সেটা deadline কে কার্যকরভাবে সবার জন্য পিছিয়ে দিত এবং
-- genuinely দেরি করা student ও ওই উইন্ডোতে সমানভাবে submit করতে পারতো।
--
-- এর বদলে দুই-ধাপের evidence-based মডেল:
--
--   ধাপ ১ (request_submission RPC) — student Submit চাপা মাত্র (বা pre-deadline
--   auto-submit timer ফায়ার করা মাত্র), frontend একটা ছোট/দ্রুত "intent" ping
--   পাঠায়। এই ping attempts.submission_requested_at এ **DB নিজের ঘড়ি**
--   (clock_timestamp()) বসায় — কিন্তু শুধু তখনই যখন সেই মুহূর্তে deadline এখনো
--   পার হয়নি। এটাই আসল evidence: client কোনো timestamp claim করছে না, বরং
--   সার্ভার নিজে রেকর্ড করছে যে এই attempt এর জন্য একটা request deadline এর
--   আগে তার কাছে পৌঁছেছিল।
--
--   ধাপ ২ (submit_attempt RPC, এখানে modify হচ্ছে) — আসল answers/score লেখে।
--   Finalize করতে দেয় যদি:
--     (a) v_now এখনো deadline এর আগে/সমান (স্বাভাবিক পথ, buffer লাগেই না), অথবা
--     (b) submission_requested_at আগে থেকেই সেট আছে (মানে ধাপ ১ deadline এর
--         আগেই সফল হয়েছিল) এবং v_now তার SUBMIT_FINALIZE_BUFFER এর মধ্যে।
--   দুটোর একটাও সত্যি না হলে (মানে এই attempt এর জন্য deadline এর আগে সার্ভারে
--   কোনো request-ই পৌঁছায়নি) — genuinely late first submission হিসেবে
--   reject হয়, ঠিক আগের মতোই। কোনো buffer এটাকে বাইপাস করতে দেয় না।
--
-- Frontend (exam page) প্রতিটা submit attempt এর (manual click, pre-deadline
-- auto-submit, retry, sendBeacon) আগে/সাথে এই ping পাঠায় (fire-and-forget,
-- idempotent, ব্যর্থ হলেও মূল submit flow কে block করে না) — দেখো
-- lib/submitIntent.ts আর app/(public)/exam/[examId]/page.tsx.
--
-- Buffer ছোট (২০ সেকেন্ড) আর শুধু transport/processing latency শোষণ করার জন্য —
-- deadline কে কারো জন্যই সরাসরি পিছিয়ে দেয় না, কারণ এটা ব্যবহার করতে হলে
-- আগে থেকেই deadline এর ভিতরে একটা সার্ভার-রেকর্ডেড intent থাকতে হবে।
-- ============================================

alter table attempts
  add column if not exists submission_requested_at timestamptz;

-- শুধু audit/debugging evidence হিসেবে রাখা হচ্ছে — client পাঠানো এই timestamp
-- কখনোই deadline/buffer সিদ্ধান্তে ব্যবহার হয় না (Layer 7: evidence, না authority)।
alter table attempts
  add column if not exists client_submit_intent_at timestamptz;

create index if not exists idx_attempts_submission_requested_at
  on attempts (submission_requested_at)
  where submission_requested_at is not null;

-- কতক্ষণ পর্যন্ত একটা রেকর্ডেড pre-deadline intent এর ভিত্তিতে finalize করা
-- যাবে — শুধু network/processing এর transit latency শোষণ করার জন্য, কোনো
-- সাধারণ "৩০ সেকেন্ড দেরি হলেও চলবে" নিয়ম না (সেই সাধারণ নিয়মে intent-evidence
-- ছাড়াই সবাই accept হয়ে যেত, এখানে হয় না)।
-- ============================================

-- ধাপ ১: pre-deadline intent ping। ছোট, দ্রুত, বারবার (idempotent) কল করা
-- নিরাপদ — Submit ক্লিক, pre-deadline auto-submit timer, বা pagehide beacon,
-- যেকোনো একটা deadline এর আগে সার্ভারে পৌঁছালেই যথেষ্ট।
create or replace function request_submission(
  p_attempt_id uuid,
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
  if found then
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  if v_attempt.submission_requested_at is not null then
    -- আগেই কোনো earlier ping/attempt intent রেকর্ড করে রেখেছে — সেই আসল
    -- evidence-টাই থেকে যাক (সবচেয়ে আগের, deadline এর সবচেয়ে কাছের-না-হয়েও
    -- সবচেয়ে নির্ভরযোগ্য প্রমাণ), duplicate ping এ overwrite করার দরকার নেই।
    return jsonb_build_object('status', 'ok', 'already_recorded', true);
  end if;

  if v_deadline is not null and v_now > v_deadline then
    -- এই মুহূর্তেই (deadline এর পরে) প্রথমবার ping এসেছে — কোনো pre-deadline
    -- evidence নেই, তাই কিছু রেকর্ড করা হচ্ছে না। genuinely late হিসেবেই থাকবে।
    return jsonb_build_object('status', 'deadline_passed');
  end if;

  update attempts
    set submission_requested_at = v_now,
        client_submit_intent_at = coalesce(p_client_submitted_at, client_submit_intent_at)
    where id = p_attempt_id;

  return jsonb_build_object('status', 'ok');
end;
$$;

-- ধাপ ২: submit_attempt — step10 এর signature/security অপরিবর্তিত (score এখনো
-- সম্পূর্ণ DB-এর ভিতরেই গণনা হয়, বাইরে থেকে কোনো score/total আসে না), শুধু
-- deadline check এ ছোট evidence-based buffer window যোগ হলো।
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
begin
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'status', 'already_submitted',
      'submitted_at', v_attempt.submitted_at,
      'score', v_attempt.score,
      'total', v_attempt.total_questions
    );
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  if found then
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  if v_deadline is not null and v_now > v_deadline then
    -- deadline পার হয়ে গেছে — সরাসরি reject না করে আগে দেখো এই attempt এর
    -- জন্য deadline এর আগেই কোনো intent রেকর্ড আছে কিনা (request_submission,
    -- বা এই একই submit_attempt এর একটা আগের pre-deadline কল — নিচে দ্রষ্টব্য)।
    if v_attempt.submission_requested_at is not null
       and v_now <= v_attempt.submission_requested_at + v_finalize_buffer then
      v_within_buffer := true;
    end if;

    if not v_within_buffer then
      -- কোনো pre-deadline evidence নেই, বা buffer window পার হয়ে গেছে —
      -- genuinely late first submission, সত্যিকারের reject, কোনো
      -- score/answers লেখা হয়নি।
      return jsonb_build_object('status', 'deadline_passed', 'deadline', v_deadline);
    end if;
    -- else: buffer এর ভিতরে, evidence সহ — নিচে normal path দিয়ে finalize হবে।
  else
    -- এখনো deadline এর আগে/সমান — এটাই সেই মুহূর্তের প্রথম "intent" evidence
    -- হিসেবেও কাজ করছে, আলাদা ping না এলেও কোনো সমস্যা নেই (স্বাভাবিক
    -- সময়মতো submit এ buffer এর দরকারই পড়ে না)।
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
  from jsonb_array_elements(p_answers) as elem
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
