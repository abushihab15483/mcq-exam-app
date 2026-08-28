-- ============================================
-- Step 17 — Contact messages
-- আগে ContactForm.tsx এর কোনো backend ছিল না (submit করলে শুধু client-side
-- "পাঠানো হয়েছে" দেখাত, আসলে কোথাও সেভ হতো না — মেসেজ হারিয়ে যেত)। এই টেবিল
-- আর app/api/contact/route.ts মিলিয়ে এখন সত্যিকারের সাবমিশন সেভ হয়, admin
-- /messages পেজ থেকে দেখা যায়।
-- Supabase Dashboard > SQL Editor এ গিয়ে এই ফাইলটা Run করো (একবারই)।
-- ============================================

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created_at on contact_messages(created_at desc);

-- RLS enable করা হলো নিরাপত্তার জন্য, যদিও ইনসার্ট/সিলেক্ট দুটোই শুধু server-side
-- (app/api/contact/route.ts, admin /messages পেজ) থেকে service-role client
-- (createAdminClient) দিয়ে হয়, যেটা RLS bypass করে। কোনো policy ইচ্ছাকৃতভাবে
-- বানানো হয়নি — মানে anon/browser key দিয়ে সরাসরি এই টেবিলে read/write করা
-- একদমই সম্ভব না, যা এখানে ঠিক আচরণ (contact message ব্যক্তিগত তথ্য, শুধু
-- admin-ই দেখবে)।
alter table contact_messages enable row level security;
