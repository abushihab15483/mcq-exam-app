-- ============================================
-- Step 7 আপডেট — school/college নাম যোগ করা হলো
-- তুমি আগেই Supabase তে schema.sql Run করে ফেলেছ, তাই এই ফাইলটা এখন
-- Supabase Dashboard > SQL Editor এ গিয়ে Run করো (একবারই) — এটা শুধু
-- পুরনো attempts টেবিলে নতুন কলাম যোগ করবে, কোনো ডেটা মুছবে না।
-- ============================================

alter table attempts
  add column if not exists student_institution text not null default '';
