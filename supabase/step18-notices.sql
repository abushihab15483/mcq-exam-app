-- ============================================
-- MCQ Exam App — Notice Board (Step 18)
-- এই ফাইল Supabase Dashboard > SQL Editor এ গিয়ে Run করবে
-- ============================================

-- ============================================
-- NOTICES TABLE
-- কোচিং সেন্টারের নোটিশ: ফলাফল ঘোষণা, ছুটি, রুটিন, ভর্তি, জরুরি, সাধারণ ঘোষণা
-- ============================================
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  category text not null check (
    category in ('result', 'off_day', 'routine', 'admission', 'urgent', 'general')
  ),
  attachment_url text,               -- PDF/JPG/PNG (Supabase Storage "notices" bucket)
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,            -- ঐচ্ছিক, দিলে ওই সময় পার হলে নোটিশ আর দেখাবে না
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Helpful indexes
-- ============================================
create index if not exists idx_notices_publish_at on notices(publish_at desc);
create index if not exists idx_notices_category on notices(category);
create index if not exists idx_notices_status on notices(status);

-- ============================================
-- RLS — exams/questions/contact_messages এর মতোই: কোনো public policy নাই,
-- anon key দিয়ে direct read/write বন্ধ, সব read/write আমাদের নিজের
-- /app/api/notices/* route (service role client) দিয়ে হবে।
-- ============================================
alter table notices enable row level security;
