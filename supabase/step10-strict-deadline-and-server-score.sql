-- ============================================
-- Step 10 — Zero grace period + fully server-side scoring
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (একবারই, step9 এর পরে)।
--
-- এই migration submit_attempt() function টা replace করে (step9 এর ভার্সনটাকে):
--
-- (A) গ্রেস পিরিয়ড সম্পূর্ণ বাদ — আগে deadline পার হওয়ার পরেও p_grace_seconds
--     (default ৬০ সেকেন্ড) পর্যন্ত submit accept হতো। এখন থেকে function এ আর
--     grace argument-ই নেই — deadline এর ঠিক ১ সেকেন্ড পরেও reject।
--     10:00:00 এর আগে (09:59:59) allowed, 10:00:00 এ/তার পরে reject।
--
-- (B) score আর app-server (Next.js route) থেকে আসে না — আগে route নিজে
--     questions fetch করে score/total জাভাস্ক্রিপ্টে গণনা করে সেটা RPC কে
--     p_score/p_total হিসেবে পাঠাতো। এখন RPC নিজেই এই একই transaction এর
--     ভিতরে questions.correct_option এর সাথে answers join করে score গণনা
--     করে — বাইরে থেকে কোনো score/total argument-ই নেওয়া হয় না, তাই কোনো
--     ভাবেই client বা এমনকি buggy app-server code দিয়েও score manipulate
--     করা সম্ভব না।
--
-- Signature বদলেছে (৫টা param থেকে ২টা তে) — তাই "create or replace" যথেষ্ট না়,
-- পুরনো function টা আগে drop করে দিতে হবে।
-- ============================================

drop function if exists submit_attempt(uuid, jsonb, integer, integer, integer);

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
  v_now timestamptz := clock_timestamp(); -- DB-এর নিজের ঘড়ি — client/app-server clock কখনো না
  v_submitted_at timestamptz;
  v_score integer;
  v_total integer;
begin
  -- FOR UPDATE row lock — duplicate/concurrent submit আটকায় (step9 থেকে অপরিবর্তিত)
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.submitted_at is not null then
    -- idempotent: আগেই জমা হয়ে গেছে, নতুন কোনো write ছাড়াই আগের score/total ফেরত
    return jsonb_build_object(
      'status', 'already_submitted',
      'submitted_at', v_attempt.submitted_at,
      'score', v_attempt.score,
      'total', v_attempt.total_questions
    );
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  if found then
    -- actualDeadline = MIN(attempt.started_at + duration_minutes, exam.end_time)
    v_deadline := least(
      v_attempt.started_at + make_interval(mins => v_exam.duration_minutes),
      v_exam.end_time
    );
  end if;

  -- জিরো গ্রেস পিরিয়ড — আর কোনো grace argument নেই, deadline পার হলেই reject,
  -- কোনো write হয় না (score/submitted_at কিছুই সেভ হয় না)
  if v_deadline is not null and v_now > v_deadline then
    return jsonb_build_object('status', 'deadline_passed', 'deadline', v_deadline);
  end if;

  v_submitted_at := v_now;

  -- answers upsert — শুধু এই attempt-এর নিজের exam-এর প্রশ্নের জন্যই লেখা হয়
  -- (exists চেক দিয়ে hardening: অন্য exam-এর question_id smuggle করে answers
  -- টেবিলে গার্বেজ ঢোকানো/score প্রভাবিত করার চেষ্টা ঠেকায়)
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

  -- Score/total সম্পূর্ণভাবে এখানেই, এই একই transaction-এ, DB-এর নিজের
  -- questions.correct_option দিয়ে গণনা হচ্ছে। কোনো score/total বাইরে থেকে
  -- (app-server বা client) আসছে না — তাই stored score client-controlled কোনো
  -- ভ্যালুর উপর নির্ভরই করতে পারে না।
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

  return jsonb_build_object('status', 'success', 'submitted_at', v_submitted_at);
end;
$$;

-- service_role client (আমাদের /api/submit route) থেকেই কল হবে, RLS bypass করে —
-- আলাদা GRANT/policy দরকার নেই (step9 থেকে অপরিবর্তিত)।
