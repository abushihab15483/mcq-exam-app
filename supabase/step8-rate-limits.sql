-- ============================================
-- Step 8 (Step 5: API rate limiting) — Supabase Dashboard > SQL Editor এ
-- গিয়ে এই ফাইলটা Run করো (একবারই)।
--
-- কেন in-memory Map না, Postgres টেবিল কেন:
-- এই অ্যাপ যদি serverless এ (Vercel এর মতো) deploy হয়, তাহলে প্রতিটা request
-- আলাদা আলাদা Node process/instance এ যেতে পারে — in-memory Map ব্যবহার করলে
-- প্রতিটা instance এর নিজের আলাদা count থাকবে, ফলে আসল rate limit কার্যত অনেক
-- বেশি loose হয়ে যাবে (bypass করা সহজ)। এখানে Supabase Postgres — যেটা এমনিতেই
-- এই প্রজেক্টের existing dependency — কে single shared counter store হিসেবে
-- ব্যবহার করা হচ্ছে, কোনো নতুন external service (Redis/Upstash) ছাড়াই।
-- ============================================

create table if not exists rate_limits (
  key text not null,
  window_start bigint not null, -- epoch ms এ bucket এর শুরুর সময়
  count integer not null default 0,
  primary key (key, window_start)
);

create index if not exists idx_rate_limits_window_start on rate_limits(window_start);

-- atomic "increment আর নতুন count রিটার্ন করো" — একই key তে দুইটা request
-- ঠিক একই সময়ে এলেও Postgres এর row-level lock এর কারণে এটা রেসকন্ডিশন-মুক্ত
-- (Step 2 তে attempts.submitted_at claim করার জন্য যেই atomic UPDATE প্যাটার্ন
-- ব্যবহার হয়েছিল, এটা একই নীতির উপর ভিত্তি করে বানানো)
create or replace function increment_rate_limit(p_key text, p_window_start bigint)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into new_count;

  return new_count;
end;
$$;

-- পুরনো bucket পরিষ্কার করার জন্য — আলাদা cron ছাড়াই, app কোড থেকে মাঝে মাঝে
-- (সব request এ না, শুধু ~২% request এ) call হয় যাতে টেবিল অসীম বড় না হতে থাকে
create or replace function cleanup_rate_limits(p_older_than bigint)
returns void
language sql
as $$
  delete from rate_limits where window_start < p_older_than;
$$;

-- এই টেবিলে anon key দিয়ে direct access দরকার নেই — শুধু service_role
-- (আমাদের API route) থেকেই ব্যবহার হবে, তাই RLS enable করে কোনো policy না
-- দিলেই যথেষ্ট (ডিফল্টভাবে anon এর জন্য বন্ধ থাকবে, service_role RLS bypass করে)
alter table rate_limits enable row level security;
