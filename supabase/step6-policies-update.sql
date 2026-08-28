-- ============================================
-- Step 6 আপডেট — যদি তুমি আগে Step 2 এর policies.sql Run করে থাকো,
-- তাহলে এই ফাইলটাও Supabase SQL Editor এ Run করো (একবারই)।
-- এটা পুরনো anon insert policy ২টা সরিয়ে দেয় — এখন থেকে attempts/answers
-- এর সব read/write আমাদের নিজের /app/api/* route (service role) দিয়ে হবে।
-- ============================================

drop policy if exists "anon can insert attempt" on attempts;
drop policy if exists "anon can insert answer" on answers;
