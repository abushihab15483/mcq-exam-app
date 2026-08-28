-- ============================================
-- MCQ Exam App — Database Schema (Step 2)
-- এই ফাইল Supabase Dashboard > SQL Editor এ গিয়ে Run করবে
-- ============================================

-- Extension for UUID generation (Supabase তে সাধারণত আগে থেকেই enabled থাকে)
create extension if not exists "pgcrypto";

-- ============================================
-- 1. EXAMS TABLE
-- একটা exam এর basic info: নাম, সময়, duration
-- ============================================
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null,
  status text not null default 'draft', -- draft | published | closed
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. QUESTIONS TABLE
-- প্রতিটা exam এর প্রশ্ন, option, সঠিক উত্তর
-- ============================================
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  question_text text not null,       -- MathJax formula সহ থাকতে পারে (যেমন: $x^2 + 1$)
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text,                   -- optional, ঐচ্ছিক ব্যাখ্যা
  order_index integer not null default 0, -- প্রশ্নের ক্রম
  created_at timestamptz not null default now()
);

-- ============================================
-- 3. ATTEMPTS TABLE
-- একজন student এর একটা exam attempt (নাম+ফোন দিয়ে শুরু)
-- ============================================
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_name text not null,
  student_phone text not null,
  student_institution text not null default '', -- school/college এর নাম
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  total_questions integer,
  unique (exam_id, student_phone) -- একই ফোন নাম্বার একই exam এ একবারই
);

-- ============================================
-- 4. ANSWERS TABLE
-- একটা attempt এ প্রতিটা প্রশ্নের উত্তর
-- ============================================
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected_option text check (selected_option in ('A', 'B', 'C', 'D')),
  unique (attempt_id, question_id) -- একটা প্রশ্নের একবারই উত্তর সেভ হবে
);

-- ============================================
-- Helpful indexes (দ্রুত query এর জন্য)
-- ============================================
create index if not exists idx_questions_exam_id on questions(exam_id);
create index if not exists idx_attempts_exam_id on attempts(exam_id);
create index if not exists idx_answers_attempt_id on answers(attempt_id);
