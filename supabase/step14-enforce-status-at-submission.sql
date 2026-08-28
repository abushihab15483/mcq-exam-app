-- ============================================
-- Step 14 — exam.status enforced at the authoritative submission RPC
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (step13 এর পরে,
-- একবারই)।
--
-- বাগ: admin কোনো exam এর status published -> closed করে দিলে, তার deadline
-- এখনো ভবিষ্যতে থাকলে (যেমন admin আগেভাগেই বন্ধ করে দিলো) — submit_attempt()
-- এতদিন শুধু deadline (started_at+duration vs exam.end_time) চেক করতো,
-- exam.status একেবারেই দেখতো না। ফলে একটা stale ব্রাউজার ট্যাব (যেটা exam
-- published থাকতেই খোলা হয়েছিল) admin বন্ধ করার পরেও সরাসরি /api/submit এ
-- POST করে normal submission সম্পন্ন করে ফেলতে পারতো — deadline তখনো না
-- পেরোনোয়। /api/exams/[examId]/questions (getExamWindowStatus দিয়ে) আগে
-- থেকেই status চেক করতো, কিন্তু সেটা শুধু নতুন প্রশ্ন লোড আটকাতো — যে ট্যাবে
-- প্রশ্ন আগেই লোড হয়ে আছে এবং answers state এ localStorage এ আছে, সেটা
-- /api/submit সরাসরি কল করতে পারতো questions না ছুঁয়েই।
--
-- Fix: submit_attempt() আর request_submission() — দুটোই আগে থেকেই ভেতরে
-- `select * into v_exam from exams where id = v_attempt.exam_id` চালায়
-- (deadline হিসাবের জন্য) — কোনো নতুন/আলাদা DB query ছাড়াই এই একই fetched row
-- থেকে v_exam.status চেক করা হচ্ছে। published না হলে (closed/archived/draft
-- — যেকোনো কিছু) নতুন কোনো submission/intent-marker রেকর্ড হয় না, terminal
-- 'exam_closed' status ফেরত যায়।
--
-- Idempotency অক্ষত: attempt আগেই finalize হয়ে থাকলে (submitted_at not null)
-- সেই already_submitted early-return এখনো status check এর আগেই ঘটে — মানে
-- exam বন্ধ হয়ে যাওয়ার পরেও আগে থেকে জমা হওয়া result normally ফেরত পাওয়া
-- যাবে (duplicate submission তৈরি হবে না, কিন্তু existing result হারাবেও না)।
-- ============================================

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
  v_now timestamptz := clock_timestamp();
begin
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.submitted_at is not null then
    return jsonb_build_object('status', 'already_submitted');
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- exam.status published না হলে (admin বন্ধ করে দিয়েছে) — deadline এখনো
  -- ভবিষ্যতে থাকলেও কোনো নতুন intent/evidence রেকর্ড করা হবে না। এই একই
  -- v_exam row (উপরেই fetch করা) থেকে চেক হচ্ছে, আলাদা কোনো query লাগছে না।
  if found and v_exam.status is distinct from 'published' then
    return jsonb_build_object('status', 'exam_closed');
  end if;

  if found then
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  if v_attempt.submission_requested_at is not null then
    return jsonb_build_object('status', 'ok', 'already_recorded', true);
  end if;

  if v_deadline is not null and v_now > v_deadline then
    return jsonb_build_object('status', 'deadline_passed');
  end if;

  update attempts
    set submission_requested_at = v_now,
        client_submit_intent_at = coalesce(p_client_submitted_at, client_submit_intent_at)
    where id = p_attempt_id;

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function submit_attempt(
  p_attempt_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_attempt attempts%rowtype;
  v_exam exams%rowtype;
  v_deadline timestamptz;
  v_now timestamptz := clock_timestamp();
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

  -- Idempotency আগে (status check এর আগে) — attempt আগেই finalize হয়ে থাকলে,
  -- exam পরে বন্ধ হয়ে গেলেও এই existing result স্বাভাবিকভাবে ফেরত যাবে।
  -- নতুন কোনো submission তৈরি হচ্ছে না, শুধু আগের ফলাফল আবার দেখানো হচ্ছে।
  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'status', 'already_submitted',
      'submitted_at', v_attempt.submitted_at,
      'score', v_attempt.score,
      'total', v_attempt.total_questions
    );
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- Authoritative closure check — deadline check এর আগে। admin বন্ধ করে দিলে,
  -- attempt এর নিজের deadline এখনো না পেরোলেও, কোনো technical buffer/pre-
  -- deadline evidence থাকলেও — কোনো নতুন submission finalize হবে না। একই
  -- v_exam row থেকে (ইতিমধ্যে deadline হিসাবের জন্য fetch করা), কোনো আলাদা
  -- query নেই।
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
    if v_attempt.submission_requested_at is not null
       and v_now <= v_attempt.submission_requested_at + v_finalize_buffer then
      v_within_buffer := true;
    end if;

    if not v_within_buffer then
      return jsonb_build_object('status', 'deadline_passed', 'deadline', v_deadline);
    end if;
  else
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
-- থেকেই কল হবে, RLS bypass করে — আলাদা GRANT/policy দরকার নেই।
