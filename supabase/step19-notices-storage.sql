-- ============================================
-- MCQ Exam App — Notice Board Storage Bucket (Step 19)
-- এই ফাইল Supabase Dashboard > SQL Editor এ গিয়ে Run করবে
-- (step18-notices.sql এর পরে, notices table তৈরি হয়ে যাওয়ার পরে)
-- ============================================

-- ============================================
-- BUCKET: notices
-- Notice এর PDF/JPG/PNG attachment রাখার জন্য। public=true, কারণ কোনো লগইন
-- ছাড়াই যে কেউ (student/অভিভাবক) notice এর attachment দেখতে/download করতে
-- পারবে — এইজন্য storage.objects এ কোনো SELECT policy লাগবে না, public
-- bucket এর ফাইল এমনিতেই public URL দিয়ে পড়া যায়।
--
-- file_size_limit ৪MB এ বসানো হয়েছে (FINAL PLAN এ বলা ৫-১০MB না) — কারণ এই
-- app Vercel এ deploy হয় আর attachment upload আমাদের নিজের API route দিয়েই
-- proxy হয়ে যায় (client সরাসরি Storage এ যায় না, admin-only security ধরে
-- রাখতে); Vercel Serverless Function এর request body hard limit ৪.৫MB,
-- তার নিচে নিরাপদ margin রেখে ৪MB। (দেখো lib/noticeStorage.ts)
--
-- allowed_mime_types এ bucket-level এ mime type lock করা হলো — যদি কেউ
-- ভুলবশত আমাদের API route এর mime check bypass করেও ফেলে (bug/edge case),
-- bucket নিজেই অন্য কোনো file type upload হতে দেবে না (defense in depth)।
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notices',
  'notices',
  true,
  4194304, -- 4 * 1024 * 1024 বাইট (৪MB)
  array['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================
-- RLS — storage.objects এ কোনো নতুন policy যোগ করা হচ্ছে না ইচ্ছাকৃতভাবে।
--
-- Supabase এ by default storage.objects এ RLS enabled, আর কোনো policy না
-- থাকলে anon/authenticated কেউই insert/update/delete করতে পারবে না —
-- exams/questions/contact_messages/notices table এর মতোই একই "কোনো public
-- policy নাই, সব write শুধু service_role (আমাদের নিজের API route) দিয়ে"
-- নীতি এখানেও বজায় থাকলো। শুধু READ public (bucket public=true এর কারণে,
-- এর জন্য কোনো policy দরকার নেই)।
-- ============================================
