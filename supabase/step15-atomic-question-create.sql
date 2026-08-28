-- ============================================
-- Step 15 — Atomic question creation (fix order_index race condition)
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (একবারই)।
--
-- কেন লাগলো:
-- আগে POST /api/questions একটা read-then-insert flow ছিল — আলাদা COUNT
-- query দিয়ে exam এর বর্তমান question সংখ্যা পড়ে, তার +1 কে order_index
-- হিসেবে insert করতো। দুইটা concurrent request (double-click, দুই ট্যাব,
-- network retry) একই COUNT পড়ে ফেলতে পারতো, ফলে একই exam এর দুইটা প্রশ্ন
-- একই order_index পেয়ে যেতো — student দেখার সময় ক্রম refresh এ পাল্টে
-- যেতে পারতো (`.order("order_index")` টাই ব্রেক করার কোনো নিয়ম নেই)।
--
-- এই migration:
--   1) backfill — বিদ্যমান ডেটায় (exam_id, order_index) duplicate থাকলে,
--      content/id/answers/scoring কিছু না পাল্টে, শুধু order_index পুনরায়
--      sequential করে দেয় (deterministic: আগের order_index, তারপর
--      created_at, তারপর id — tie-break হিসেবে)।
--   2) unique constraint — (exam_id, order_index) জোড়া database-level এ
--      unique বাধ্য করে দেয় (order_index কখনোই globally unique না, ভিন্ন
--      exam এর নিজের নিজের ১,২,৩... থাকতে পারে)।
--   3) create_question_atomic() RPC — একই exam_id এর জন্য একটা
--      transaction-scoped Postgres advisory lock নেয়, lock ধরে রেখেই
--      coalesce(max(order_index), 0) + 1 হিসাব করে insert করে। এতে
--      COUNT(*)+1 বা lock ছাড়া MAX(*)+1 — দুটোই বাদ, race সম্ভবই না।
--      advisory lock exam_id এর হ্যাশ থেকে বানানো — তাই ভিন্ন exam এর
--      concurrent insert একে অপরকে block করে না, শুধু একই exam এর মধ্যেই
--      সিরিয়ালাইজড হয়।
-- ============================================

-- ------------------------------------------------
-- 1) BACKFILL — বিদ্যমান (exam_id, order_index) duplicate থাকলে ঠিক করো,
--    unique constraint যোগ করার আগে। প্রশ্নের content/id/answers অপরিবর্তিত
--    থাকে — শুধু order_index পুনরায় গোনা হয়, প্রতিটা exam এর ভিতরে আলাদা
--    আলাদাভাবে, deterministic ক্রমে (পুরনো order_index আগে, created_at/id
--    tie-breaker হিসেবে — যাতে relative order যতটা সম্ভব বজায় থাকে)।
-- ------------------------------------------------
with ranked as (
  select
    id,
    row_number() over (
      partition by exam_id
      order by order_index asc, created_at asc, id asc
    ) as new_order_index
  from questions
)
update questions q
set order_index = ranked.new_order_index
from ranked
where q.id = ranked.id
  and q.order_index is distinct from ranked.new_order_index;

-- ------------------------------------------------
-- 2) DATABASE-LEVEL UNIQUENESS — (exam_id, order_index), globally না।
--    Backfill এর পর এই constraint নিরাপদে যোগ হবে (কোনো duplicate বাকি
--    থাকবে না)। এটাই আসল guarantee — application code যাই করুক, DB নিজে
--    দুইটা রো একই (exam_id, order_index) নিয়ে থাকতে দেবে না।
-- ------------------------------------------------
create unique index if not exists questions_exam_id_order_index_key
  on questions (exam_id, order_index);

-- ------------------------------------------------
-- 3) ATOMIC RPC — advisory transaction lock (per exam_id) + insert, একই
--    transaction/function call এর ভিতরে। server_role client থেকেই কল হবে
--    (আমাদের /api/questions route এমনিতেই RLS bypass করে), তাই আলাদা
--    GRANT/policy দরকার নেই — submit_attempt()/increment_rate_limit() এর
--    মতোই এই প্রজেক্টের existing convention।
--
--    order_index ক্লায়েন্ট থেকে নেওয়া হয় না — শুধু server/DB এটা ঠিক করে,
--    এই ফাংশনের parameter list এও order_index নেই।
-- ------------------------------------------------
create or replace function create_question_atomic(
  p_exam_id uuid,
  p_question_text text,
  p_option_a text,
  p_option_b text,
  p_option_c text,
  p_option_d text,
  p_correct_option text,
  p_explanation text default null
)
returns questions
language plpgsql
as $$
declare
  v_next_order integer;
  v_question questions%rowtype;
begin
  -- একই exam_id এর জন্য transaction-scoped advisory lock — এই transaction
  -- শেষ (commit/rollback) না হওয়া পর্যন্ত একই exam_id এর অন্য যেকোনো কল এখানে
  -- block হয়ে অপেক্ষা করবে। ভিন্ন exam_id হ্যাশ ভিন্ন হওয়ায় একে অপরকে
  -- block করে না। hashtext() একটা int4 দেয়, pg_advisory_xact_lock(bigint)
  -- সেটাকে bigint এ নিয়ে নেয় — UUID সরাসরি bigint এ যায় না তাই এই hash।
  perform pg_advisory_xact_lock(hashtext(p_exam_id::text)::bigint);

  -- Lock ধরে রেখেই next order value হিসাব — COUNT(*)+1 না (delete এ gap
  -- হলে ভুল হতো), বরং coalesce(max(order_index), 0) + 1। লক থাকায় এই
  -- হিসাব আর নিচের insert এর মাঝে অন্য কোনো concurrent insert ঢুকতে পারবে
  -- না — তাই দুইটা concurrent call কখনো একই order_index পাবে না।
  select coalesce(max(order_index), 0) + 1
    into v_next_order
    from questions
    where exam_id = p_exam_id;

  insert into questions (
    exam_id, question_text, option_a, option_b, option_c, option_d,
    correct_option, explanation, order_index
  )
  values (
    p_exam_id, p_question_text, p_option_a, p_option_b, p_option_c, p_option_d,
    p_correct_option, p_explanation, v_next_order
  )
  returning * into v_question;

  return v_question;
end;
$$;
