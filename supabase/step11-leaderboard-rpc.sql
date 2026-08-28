-- ============================================
-- Step 11 — Leaderboard ranking DB-side এ নিয়ে যাওয়া (Fix #9)
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো।
--
-- আগে /api/leaderboard/[examId] সব submitted attempts fetch করে
-- (student_name, score, total_questions, started_at, submitted_at) নিয়ে
-- JavaScript এ duration_seconds হিসাব করে score DESC, duration ASC অনুযায়ী
-- sort করতো। এখন এই ranking (filter + order) সরাসরি Postgres এ হয় —
-- route শুধু ordered রেজাল্ট নিয়ে rank বসিয়ে দেয়, কোনো JS sort নেই।
--
-- Ranking rule অপরিবর্তিত: submitted_at not null, score বেশি আগে,
-- সমান score হলে কম duration (started_at থেকে submitted_at) আগে।
-- ============================================

create or replace function public.leaderboard_for_exam(p_exam_id uuid)
returns table (
  student_name text,
  score integer,
  total_questions integer,
  duration_seconds integer
)
language sql
stable
as $$
  select
    a.student_name,
    coalesce(a.score, 0) as score,
    coalesce(a.total_questions, 0) as total_questions,
    greatest(0, round(extract(epoch from (a.submitted_at - a.started_at)))::integer) as duration_seconds
  from attempts a
  where a.exam_id = p_exam_id
    and a.submitted_at is not null
  order by score desc, duration_seconds asc;
$$;
