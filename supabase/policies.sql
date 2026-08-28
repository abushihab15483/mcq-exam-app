-- ============================================
-- MCQ Exam App — Row Level Security (RLS) Policies (Step 2)
-- এই ফাইল schema.sql এর পর Run করবে
-- ============================================

-- RLS চালু করা — এখন থেকে সব access নিয়ম মেনে হবে
alter table exams enable row level security;
alter table questions enable row level security;
alter table attempts enable row level security;
alter table answers enable row level security;

-- ============================================
-- EXAMS: শুধু service_role (admin/API route) সব করতে পারবে।
-- Public/anon key দিয়ে direct read/write বন্ধ —
-- সব exam ডেটা আমাদের নিজের API route (service role দিয়ে) এর ভিতর দিয়ে যাবে।
-- এতে exam এর সময়/status নিয়ে কেউ direct manipulate করতে পারবে না।
-- (কোনো policy না দিলে RLS by default সব বন্ধ করে দেয় anon এর জন্য)
-- ============================================

-- ============================================
-- QUESTIONS: একই কারণে direct anon access বন্ধ।
-- Student কে প্রশ্ন দেখানো হবে API route দিয়ে (correct_option বাদ দিয়ে),
-- সরাসরি Supabase client দিয়ে না — যাতে সঠিক উত্তর client এ leak না হয়।
-- ============================================

-- ============================================
-- ATTEMPTS / ANSWERS (Step 6 আপডেট):
-- Step 2 এ anon কে সরাসরি INSERT policy দেওয়া হয়েছিল, কিন্তু Step 6 এ দেখা গেল
-- attempt তৈরির আগে exam এর start/end time window ও duplicate-phone check করা দরকার —
-- এই logic RLS policy দিয়ে করা যায় না। তাই এখন attempts/answers এর সব read/write
-- আমাদের নিজের /app/api/* route (service role client, RLS bypass করে) দিয়ে হয়,
-- anon key দিয়ে direct insert আর অনুমোদিত না। কোনো policy না থাকায় RLS
-- ডিফল্টভাবে anon এর সব access বন্ধ রাখে — এটাই এখন কাঙ্ক্ষিত অবস্থা।
--
-- সংক্ষেপে (Step 6 এর পর): exams/questions/attempts/answers — সব ৪টা table এর
-- read/write ই student ও admin উভয়ের জন্য /app/api/* route দিয়ে হয়, direct
-- Supabase client কল দিয়ে না। এতে security bug (student নিজের score বদলে ফেলা,
-- correct answer আগেই দেখে ফেলা, exam window বাইপাস করা) আটকানো যায়।
-- ============================================
