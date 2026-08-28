-- ============================================
-- Step 9 — Atomic exam submission RPC
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (একবারই)।
--
-- কেন লাগলো:
-- আগে /api/submit route এ ২টা আলাদা DB call ছিল — (১) attempts.submitted_at
-- claim (atomic UPDATE ... WHERE submitted_at IS NULL) আর (২) answers upsert।
-- এই দুইটা একটা single transaction ছিল না — claim সফল হয়ে গেলেও answers
-- upsert fail করতে পারতো, আর route তবু success ফেরত দিতো (score DB তে সেভ
-- হয়ে গেছে, কিন্তু answers অসম্পূর্ণ)। এই RPC পুরো কাজটাকে একটা Postgres
-- function এর ভিতরে নিয়ে আসে — Postgres function নিজেই একটা implicit
-- transaction, তাই কোনো ধাপ fail করলে পুরোটাই rollback হয় (attempt আর
-- "submitted" হিসেবে মার্ক থাকবে না)।
--
-- এই RPC-ই এখন authoritative deadline enforce করে (DB এর own now() দিয়ে,
-- client/app-server clock না) — আগে route শুধু `late` flag বানাতো কিন্তু
-- আসলে submission block করতো না।
-- ============================================

create or replace function submit_attempt(
  p_attempt_id uuid,
  p_answers jsonb,             -- jsonb array: [{"question_id": "...", "selected_option": "A"}, ...]
  p_score integer,
  p_total integer,
  p_grace_seconds integer default 60
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
begin
  -- FOR UPDATE row lock — একই attempt_id এ দুইটা concurrent call এলে দ্বিতীয়টা
  -- এখানে block হয়ে থাকবে, প্রথমটার transaction commit/rollback না হওয়া পর্যন্ত।
  -- এভাবেই duplicate submit/duplicate score-write আটকানো হয়, শুধু app-level
  -- isSubmitting/useRef এর উপর ভরসা করা হয় না।
  select * into v_attempt from attempts where id = p_attempt_id for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_attempt.submitted_at is not null then
    -- আগেই কেউ (এই student নিজেই আগের request এ, বা concurrent request) জিতে
    -- গেছে — idempotent: কোনো নতুন write না করেই আগের ফলাফল জানিয়ে দাও
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

  if v_deadline is not null and v_now > (v_deadline + make_interval(secs => p_grace_seconds)) then
    -- Deadline সত্যিই পার হয়ে গেছে (grace সহ) — এখানেই reject, কোনো write হয়নি,
    -- score/submitted_at কিছুই সেভ হয়নি। এটাই আসল enforcement — আগে শুধু
    -- `late: true` ফেরত দিয়ে তবু accept করে ফেলতো, এখন করে না।
    return jsonb_build_object('status', 'deadline_passed', 'deadline', v_deadline);
  end if;

  v_submitted_at := v_now;

  update attempts
    set submitted_at = v_submitted_at,
        score = p_score,
        total_questions = p_total
    where id = p_attempt_id;

  -- answers upsert — same transaction এর ভিতরেই, তাই এটা fail করলে উপরের
  -- attempts UPDATE-ও rollback হয়ে যাবে (আংশিক submit বলে কিছু থাকবে না)
  insert into answers (attempt_id, question_id, selected_option)
  select
    p_attempt_id,
    (elem->>'question_id')::uuid,
    elem->>'selected_option'
  from jsonb_array_elements(p_answers) as elem
  where elem->>'selected_option' is not null
  on conflict (attempt_id, question_id)
  do update set selected_option = excluded.selected_option;

  return jsonb_build_object('status', 'success', 'submitted_at', v_submitted_at);
end;
$$;

-- এই function টা service_role client (আমাদের /api/submit route) থেকেই কল হবে,
-- যেটা এমনিতেই RLS bypass করে — তাই আলাদা GRANT/policy দরকার নেই।
