-- ============================================
-- Step 12 — Leaderboard: DB-level row LIMIT + supporting index (Fix #9)
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো।
--
-- বাগ: step11 এর leaderboard_for_exam() filter + order (score desc,
-- duration asc) DB-তে করে ঠিকই, কিন্তু কোনো LIMIT ছিল না — তাই একটা exam এ
-- হাজার হাজার submitted attempt থাকলে সবগুলোই RPC থেকে ফেরত আসতো, আর
-- /api/leaderboard/[examId] সেই পুরো array-ই client কে পাঠিয়ে দিতো (route এ
-- থাকা LEADERBOARD_LIMIT=60 আসলে rate-limit window এর জন্য, row limit হিসেবে
-- কখনো ব্যবহারই হতো না)। UI (LeaderboardTable) শুধু top সীমিত সংখ্যক row-ই
-- দেখায়, pagination নেই — তাই DB-level Top-N ঠিক approach।
--
-- Ranking rule অপরিবর্তিত (score desc, duration asc, submitted_at not null
-- filter) — শুধু p_limit parameter আর LIMIT clause যোগ হলো।
-- ============================================

create or replace function public.leaderboard_for_exam(p_exam_id uuid, p_limit integer default 60)
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
  order by score desc, duration_seconds asc
  limit greatest(1, least(p_limit, 500)); -- সেফটি cap, caller ভুল করে বিশাল limit পাঠালেও
$$;

-- filter (exam_id + submitted_at not null) আর score DESC ordering কে সরাসরি সাপোর্ট
-- করার জন্য — আগে শুধু plain idx_attempts_exam_id (exam_id) ছিল, যেটা filter এ সাহায্য
-- করে কিন্তু sort এর জন্য আলাদা করে score sort করতে হতো। duration_seconds কম্পিউটেড
-- কলাম (স্টোর করা না) বলে সেটা index এ রাখা যায় না — score ties সাধারণত ছোট গ্রুপ,
-- সেটুকু in-memory sort-ই যথেষ্ট।
create index if not exists idx_attempts_leaderboard
  on attempts (exam_id, score desc)
  where submitted_at is not null;
