# MCQ Online Exam App — Step 1: Project Setup

## 🆕 সর্বশেষ আপডেট — SEO + Reliability + Contact Form

**তোমার এখন যা করতে হবে:**
1. Supabase Dashboard → SQL Editor এ গিয়ে `supabase/step17-contact-messages.sql` Run করো (একবারই) — নাহলে contact form থেকে মেসেজ সেভ হবে না।
2. Vercel Dashboard → Settings → Environment Variables এ `NEXT_PUBLIC_SITE_URL` বসাও (তোমার আসল ডোমেইন বা ভার্সেল লিংক, শেষে `/` ছাড়া) — sitemap/robots/OG লিংকের জন্য।
3. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — এই তিনটা env var Vercel এ **অবশ্যই** বসাতে হবে (Production + Preview দুই জায়গাতেই), নাহলে সাইট/admin panel কাজ করবে না।

**যা যা ঠিক/যোগ করা হলো:**
- **SEO:** প্রতিটা পেজের title/description/canonical, `robots.txt`, `sitemap.xml`, OpenGraph/Twitter card (শেয়ার করলে ছবিসহ প্রিভিউ), favicon/app icon/manifest, JSON-LD structured data (local SEO), Contact/Footer এ আসল ঠিকানা-ফোন নাম্বার।
- **Reliability (deploy করলে/মাঝে মাঝে crash এর সমস্যা):** Supabase env var মিসিং থাকলে আগে cryptic crash হতো (`supabaseUrl is required`), এখন পরিষ্কার বাংলা এরর মেসেজ server log এ যায়, সাইট friendly error page দেখায় crash না করে। Admin panel এর middleware (login/dashboard/exams/results/messages প্রটেক্ট করে) আগে Supabase এ সাময়িক network সমস্যা হলে পুরো crash করত (raw 500) — এখন fail-closed ভাবে `/login` এ পাঠিয়ে দেয়, crash করে না। `app/global-error.tsx` যোগ করা হলো root layout crash এর জন্যও একটা fallback থাকার জন্য।
  - **নোট:** Supabase ফ্রি প্ল্যানের প্রজেক্ট প্রায় ১ সপ্তাহ ব্যবহার না হলে নিজে থেকেই "paused" হয়ে যায় — সাইট হঠাৎ কাজ না করলে প্রথমে Supabase Dashboard এ গিয়ে প্রজেক্ট paused কিনা চেক করো, "Resume" বাটনে চাপ দাও।
- **Contact form:** আগে সাবমিট করলে শুধু UI তে "পাঠানো হয়েছে" দেখাত, মেসেজ কোথাও সেভ হতো না (fake)। এখন `contact_messages` টেবিলে আসল সেভ হয়, admin panel এর নতুন **"মেসেজ"** পেজ (`/messages`) থেকে সব মেসেজ দেখা যায়।

---



এইটা শুধু কাঠামো (folder structure)। ভেতরের কাজ (student form, admin panel, DB connect) পরের ধাপগুলোতে ভরা হবে। এখন শুধু project ঠিকমতো বসছে কিনা check করবে।

## তোমার করণীয় (এখন)

### ১. Node.js install (যদি না থাকে)
nodejs.org থেকে LTS version install করো।

### ২. এই ফোল্ডার unzip করে টার্মিনাল/CMD এ ঢোকো
```
cd mcq-exam-app
```

### ৩. Package install
```
npm install
```

### ৪. লোকালি চালিয়ে দেখো
```
npm run dev
```
ব্রাউজারে `http://localhost:3000` খুললে "Student entry form — coming in Step 4" লেখা দেখবে। এইটা মানে setup ঠিক আছে।

### ৫. GitHub এ push করা

GitHub এ নতুন empty repository বানাও (README ছাড়া), তারপর:
```
git init
git add .
git commit -m "Step 1: project setup"
git branch -M main
git remote add origin <তোমার-repo-URL>
git push -u origin main
```

### ৬. .env.local বানানো (এখনই দরকার নেই, Step 2 এর পর লাগবে)
`.env.local.example` ফাইলের নাম copy করে `.env.local` বানাবে, Supabase key বসাবে।

## ফোল্ডার কী কী আছে

```
app/(public)/   → student পেজ (এখনো খালি placeholder)
app/(admin)/    → admin পেজ (এখনো খালি placeholder)
app/api/        → API routes (এখনো খালি placeholder)
components/     → UI components (এখনো খালি, Step 3 এ ভরা হবে)
lib/            → helper functions + supabase connection (এখনো খালি, Step 2/3 এ ভরা হবে)
types/          → TypeScript types (Step 2 এর পর ভরা হবে)
supabase/       → SQL schema files (Step 2 এ বসবে)
middleware.ts   → admin route protect (Step 6 এ ভরা হবে)
```

## এরপর কী

Step 2: Database schema (Supabase SQL files) — পরের মেসেজে দিব।

---

# Step 2: Database Schema (Supabase)

`.env.local` ফাইলে তোমার Supabase key আগে থেকেই বসানো আছে। এখন শুধু Supabase এ table বানাতে হবে।

## করণীয়

### ১. Supabase Dashboard এ যাও
- https://supabase.com/dashboard এ গিয়ে তোমার প্রজেক্ট (`mcq-exam-app` বা যা নাম দিয়েছ) ওপেন করো

### ২. SQL Editor খোলো
- বাম পাশের মেনু থেকে **SQL Editor** এ ক্লিক করো
- **"New query"** ক্লিক করো

### ৩. প্রথম ফাইল Run করো — `supabase/schema.sql`
- এই প্রজেক্টের `supabase/schema.sql` ফাইলটা খোলো (Notepad দিয়ে খুললেই হবে)
- পুরো লেখা copy করে SQL Editor এ paste করো
- ডানপাশে/নিচে **"Run"** বাটনে ক্লিক করো
- "Success" লেখা দেখলে ঠিক আছে

### ৪. দ্বিতীয় ফাইল Run করো — `supabase/policies.sql`
- **"New query"** আবার ক্লিক করো
- `supabase/policies.sql` ফাইলের লেখা copy-paste করে **Run** করো

### ৫. Table তৈরি হয়েছে কিনা check করো
- বাম পাশের মেনু থেকে **Table Editor** এ ক্লিক করো
- এখানে ৪টা table দেখতে পাবে: `exams`, `questions`, `attempts`, `answers`

এই ৪টা table দেখলেই Step 2 সম্পূর্ণ। ✅

## এই Schema তে যা আছে

| Table | কী রাখে |
|---|---|
| `exams` | exam এর নাম, শুরু/শেষ সময়, duration, status |
| `questions` | প্রশ্ন, ৪টা option, সঠিক উত্তর, ব্যাখ্যা |
| `attempts` | কোন student কোন exam দিয়েছে (নাম+ফোন), score |
| `answers` | student এর প্রতিটা প্রশ্নের উত্তর |

**Security নোট:** Student side থেকে সরাসরি `questions`/`exams` table পড়া বন্ধ রাখা হয়েছে (RLS দিয়ে) — এতে করে exam এর সঠিক উত্তর client-side এ leak হবে না। সব read/write আমাদের নিজের API route (Step 6) দিয়ে হবে, যেটা service role key ব্যবহার করে নিরাপদভাবে ডেটা দেবে।

## এরপর কী

Step 3: Reusable UI Components (Button, Input, Card ইত্যাদি) — পরের মেসেজে দিব।

---

# Step 3: Reusable UI Components

## নতুন কী যোগ হলো

- `components/ui/Button.tsx` — ৪ ধরনের বাটন (primary, secondary, outline, danger)
- `components/ui/Input.tsx` — label + error message সহ input field
- `components/ui/Card.tsx` — সাদা বক্স container (প্রশ্ন, রেজাল্ট, dashboard stat — সব জায়গায় ব্যবহার হবে)
- `components/ui/Modal.tsx` — popup dialog (submit confirm, delete confirm এর জন্য)
- `components/ui/Table.tsx` — ডাটা টেবিল (student list, leaderboard এর জন্য)
- `components/ui/ScoreSeal.tsx` — গোল স্ট্যাম্পের মতো score দেখানোর special component (এই app এর "signature" design)
- Fonts + রং (design tokens) বসানো হয়েছে — Fraunces (heading), Inter (body), IBM Plex Mono (সংখ্যা/timer)

## যাচাই করবে কীভাবে

```
npm run dev
```
`localhost:3000` খুলে দেখবে — বাটন, ইনপুট ফর্ম, টেবিল, আর গোল স্ট্যাম্পের মতো একটা score বক্স দেখা যাচ্ছে। এটাই এখনকার "preview" পেজ — আসল form এখানে Step 4 এ বসবে।

সব element ঠিকমতো দেখা গেলে (রং/ফন্ট লোড হয়েছে, বাটনে hover করলে রং পাল্টায়) Step 3 সম্পূর্ণ। ✅

## এরপর কী

Step 4: Student Panel (entry form → exam screen with timer → result page) — পরের মেসেজে দিব।

---

# Step 4: Student Panel

## নতুন কী যোগ হলো

- `components/student/EntryForm.tsx` — নাম+ফোন ফর্ম, ভুল হলে নিচে লাল error message
- `components/student/TimerBar.tsx` — countdown timer, ৫ মিনিটের কমে হলুদ, ১ মিনিটের কমে লাল
- `components/student/ProgressBar.tsx` — কতগুলো প্রশ্নের উত্তর দেওয়া হয়েছে
- `components/student/QuestionCard.tsx` — প্রশ্ন + ৪টা option, math ফর্মুলা ($...$) render করে
- `components/student/ResultCard.tsx`, `LeaderboardTable.tsx` — ফলাফল পেজ
- `components/shared/MathRenderer.tsx` + `MathProvider.tsx` — LaTeX গণিত ফর্মুলা দেখানোর জন্য
- `lib/mock-data.ts` — এখন test করার জন্য নকল প্রশ্ন/exam data (Step 6 এ আসল Supabase data দিয়ে বদলাবে)
- Next.js এর security update — `next` package পুরনো ভার্সনে একটা known vulnerability ছিল, patched ভার্সনে (14.2.35) upgrade করা হয়েছে

## যাচাই করবে কীভাবে

```
npm install
npm run dev
```
- `localhost:3000` এ নাম+ফোন ফর্ম দেখবে — ভুল ফোন নাম্বার দিলে error message আসে কিনা check করো
- সঠিক তথ্য দিয়ে সাবমিট করলে exam স্ক্রিনে যাবে — timer count down হচ্ছে কিনা, math ফর্মুলা ঠিকমতো দেখা যাচ্ছে কিনা দেখো
- একটা option বাছাই করলে progress bar বাড়ে কিনা দেখো
- "উত্তর জমা দাও" চাপলে confirm popup আসবে, confirm করলে result পেজে যাবে (নকল score দেখাবে)

## Accessibility (WCAG 2.1 AA checked)

| # | চেক | অবস্থা |
|---|---|---|
| 1 | ফর্ম label সব input এর সাথে যুক্ত (`for`/`id`) | ✅ |
| 2 | রঙের পাশাপাশি timer এ টেক্সট warning ("সময় প্রায় শেষ") — শুধু রং দিয়ে বোঝানো হয়নি | ✅ |
| 3 | সব বাটনের touch target ≥44px | ✅ |
| 4 | Option/radio গুলো keyboard দিয়ে navigate করা যায়, native radio input ব্যবহার হয়েছে | ✅ |
| 5 | Modal এ Escape চাপলে বন্ধ হয়, focus আটকায় না | ✅ |
| 6 | Timer/progress bar এ `role="progressbar"` + `aria-valuenow` | ✅ |
| 7 | Text contrast — ink (#1C2333) on paper (#F7F7F5) ≈ 14:1, gold accent on white ≈ 4.6:1 | ✅ ৪.৫:১ ছাড়িয়ে গেছে |

## এরপর কী

Step 5: Admin Panel (login, dashboard, exam/question CRUD, student list) — পরের মেসেজে দিব।

---

# Step 5: Admin Panel

## নতুন কী যোগ হলো

- `components/admin/AdminLoginForm.tsx` — Supabase Auth দিয়ে email+password লগইন
- `components/admin/AdminNav.tsx`, `AdminShell.tsx` — লগইনের পর নেভিগেশন বার (ড্যাশবোর্ড, পরীক্ষাসমূহ, লগআউট)
- `components/admin/ExamForm.tsx` — পরীক্ষা তৈরি/এডিট ফর্ম
- `components/admin/QuestionForm.tsx`, `QuestionList.tsx` — প্রশ্ন CRUD
- `components/admin/StudentTable.tsx`, `StatsCard.tsx` — student list, dashboard stats
- `app/(admin)/dashboard`, `exams`, `exams/new`, `exams/[examId]`, `exams/[examId]/questions` — সব পেজ এখন কাজ করে (mock data দিয়ে)
- `middleware.ts` — এখন সত্যিকারের auth check করে, লগইন ছাড়া `/dashboard` বা `/exams` এ ঢুকতে দিবে না

## প্রথমবার Admin User বানানো লাগবে (একবারই করতে হবে)

Student side এর মতো admin sign-up ফর্ম রাখা হয়নি — নিরাপত্তার জন্য admin account শুধু তুমি নিজে Supabase Dashboard থেকে বানাবে:

1. https://supabase.com/dashboard → তোমার project খোলো
2. বাম মেনু থেকে **Authentication** → **Users**
3. **"Add user"** → **"Create new user"**
4. Email আর Password দাও (এই email+password দিয়েই admin panel এ লগইন করবে)
5. **"Auto Confirm User"** টিক দিয়ে রাখো (তাহলে email verify করা লাগবে না)
6. **Create user**

## যাচাই করবে কীভাবে

```
npm install
npm run dev
```
- `localhost:3000/login` এ গিয়ে উপরের email+password দিয়ে লগইন করো
- লগইন ছাড়া সরাসরি `localhost:3000/dashboard` এ যাওয়ার চেষ্টা করো — `/login` এ ফিরিয়ে দেয় কিনা দেখো (এটাই middleware protect করছে)
- Dashboard এ stats দেখবে, "নতুন পরীক্ষা তৈরি করো" দিয়ে exam form টেস্ট করো
- **পরীক্ষাসমূহ** → কোনো একটা exam এর "প্রশ্ন দেখো" এ ক্লিক করে প্রশ্ন Add/Edit/Delete টেস্ট করো
- লগআউট বাটন কাজ করছে কিনা দেখো

## এরপর কী

Step 6: API Routes + সব জায়গায় mock data এর বদলে আসল Supabase data ওয়্যার করা — পরের মেসেজে দিব।

---

# Step 6: API Routes + Real Supabase Wiring

## নতুন কী যোগ হলো

- **API Routes (সব বাস্তব করা হলো):**
  - `POST /api/attempts` — student entry ফর্ম সাবমিট করলে attempt তৈরি হয়। Exam এখনো শুরু হয়নি/শেষ হয়ে গেছে/প্রকাশিত না — এই সব check করে। একই ফোন নাম্বার দিয়ে দ্বিতীয়বার চেষ্টা করলে "তুমি ইতিমধ্যে অংশ নিয়েছ" error দেখায়।
  - `GET /api/exams/[examId]/questions` — student exam স্ক্রিনের প্রশ্ন আনে, `correct_option`/`explanation` ছাড়া।
  - `POST /api/submit` — server নিজে score গণনা করে (client থেকে score trust করে না), answers save করে, attempt এর `submitted_at`/`score` আপডেট করে।
  - `GET /api/leaderboard/[examId]` — rank সহ leaderboard, একই score হলে যে আগে জমা দিয়েছে তার rank আগে। Exam এর `end_time` পার না হওয়া পর্যন্ত hidden থাকে (project plan অনুযায়ী)।
  - `GET /api/attempts/[attemptId]` — student এর নিজের result দেখানোর জন্য (result page ব্যবহার করে), exam শেষ না হলে score hidden থাকে।
  - `GET/POST/PUT/DELETE /api/exams`, `/api/exams/[examId]` — admin exam CRUD (GET single exam public, বাকি সব admin-only)।
  - `GET/POST/PUT/DELETE /api/questions` — admin question CRUD (সব admin-only)।
  - `GET /api/attempts?exam_id=...` — admin panel এর student list এর জন্য।
- **Admin panel এর সব ফর্ম** (ExamForm, QuestionForm) এখন console.log এর বদলে সত্যিকারের Supabase insert/update/delete করে। Dashboard/exams list/questions list এখন real data দেখায়।
- **Timer resume + auto-submit:** exam পেজ এখন attempt শুরুর সময় + duration থেকে একটা "deadline" হিসাব করে (localStorage এ রাখা)। পেজ reload করলে বা tab বন্ধ করে পরে খুললে টাইমার ঠিক জায়গা থেকে শুরু হয়। যা উত্তর দেওয়া ছিল তা localStorage এ প্রতিটা ক্লিকের সাথে সেভ হয়। সময় শেষ হয়ে থাকলে (টাইমার দিয়ে গণনা করে বা reload এ দেখে) — এখন পর্যন্ত সেভ করা উত্তর দিয়েই স্বয়ংক্রিয়ভাবে জমা হয়ে যায়।
- **নতুন routing (আপডেট — একটাই fix লিংক):** Student দের জন্য একটাই fix লিংক আছে — `/exam`। এখানে গেলে এখন যেই exam চলছে (published + start_time-end_time এর মধ্যে) সেটা automatic দেখাবে। কোনো exam চলতে না থাকলে "এখন কোনো পরীক্ষা চলছে না" মেসেজ দেখাবে। প্রতি exam এর জন্য আলাদা লিংক মনে রাখতে/শেয়ার করতে হবে না। হোমপেজ (`/`) এ শুধু "পরীক্ষা দিতে যাও" বাটন আছে — এটাই ভবিষ্যতে পুরো ওয়েবসাইটের হোমপেজ হবে, যেখানে অন্য section ও (notice, blog ইত্যাদি) যোগ হতে পারবে।
- **RLS policy আপডেট:** `attempts`/`answers` টেবিলের পুরনো anon insert policy ২টা আর দরকার নেই — এখন সব write আমাদের নিজের API route (service role) দিয়ে হয়। নতুন ফাইল `supabase/step6-policies-update.sql` এই পুরনো policy বাতিল করে।

## Supabase এ যা নতুন Run করতে হবে

Supabase Dashboard > SQL Editor এ গিয়ে:
```
supabase/step6-policies-update.sql
```
এই ফাইলের কন্টেন্ট Run করো (একবারই — এটা পুরনো ২টা policy সরিয়ে দেয়)।

## যাচাই করবে কীভাবে

```
npm install
npm run dev
```

### ১. একটা exam বানাও (admin থেকে)
- `/login` এ লগইন করো
- `/exams/new` দিয়ে একটা exam বানাও — **শুরুর সময় এখনকার আগে**, **শেষ সময় কিছুক্ষণ পরে**, status **"published"** দাও
- `/exams` এ গিয়ে সেই exam এর "প্রশ্ন দেখো" এ ক্লিক করে ৩-৪টা প্রশ্ন যোগ করো (correct answer ঠিকমতো সিলেক্ট করে)
- URL থেকে exam এর id কপি করো (যেমন `/exams/<এই-id>/questions`)

### ২. Student flow টেস্ট করো
- ব্রাউজারে (আলাদা ট্যাব/incognito) `localhost:3000/exam` এ যাও — exam এর title/duration দেখা উচিত (কারণ exam এখন published আর active সময়ে আছে)
- নাম+ফোন দিয়ে "পরীক্ষা শুরু করো" — exam স্ক্রিনে চলে যাওয়া উচিত, timer সঠিক duration থেকে গণনা শুরু করবে
- একই ফোন নাম্বার দিয়ে আবার entry ফর্মে গেলে "তুমি ইতিমধ্যে অংশ নিয়েছ" error আসা উচিত
- ২-৩টা প্রশ্নের উত্তর দিয়ে **পেজ reload করো** — উত্তর আর টাইমার আগের জায়গা থেকেই দেখা উচিত (হারিয়ে যাবে না)
- "উত্তর জমা দাও" চাপো — confirm popup, তারপর জমা দিলে result পেজে যাওয়া উচিত
- exam এর `end_time` এর আগে হলে result পেজে "পরীক্ষা শেষ হওয়ার পর ফলাফল দেখতে পারবে" লেখা দেখা উচিত (score/leaderboard hidden)

### ৩. Auto-submit টেস্ট করো
- খুব কম duration (যেমন ১ মিনিট) দিয়ে একটা নতুন exam বানাও, entry দিয়ে শুরু করো
- ১ মিনিট অপেক্ষা করো — timer 0 তে গেলে স্বয়ংক্রিয়ভাবে জমা হয়ে result পেজে যাওয়া উচিত (কোনো popup ছাড়াই)
- আরেকবার — শুরু করার পর সাথে সাথে ট্যাব বন্ধ করে ১ মিনিট পর আবার `/exam/<exam-id>` এ যাও — সাথে সাথে auto-submit হয়ে result এ চলে যাওয়া উচিত

### ৪. Result visibility টেস্ট করো
- exam এর `end_time` পার হয়ে গেলে result পেজ আবার refresh করো (বা Supabase Table Editor থেকে exam এর `end_time` অতীতে বসিয়ে দাও) — এখন আসল score + leaderboard দেখা উচিত

### ৫. Admin CRUD টেস্ট করো
- exam এডিট করে সময়/status বদলাও — সংরক্ষণ হচ্ছে কিনা `/exams` লিস্টে গিয়ে দেখো
- একটা প্রশ্ন এডিট/ডিলিট করে দেখো Supabase Table Editor এ `questions` টেবিলে সত্যিই বদলে যাচ্ছে কিনা
- `questions` পেজে "অংশগ্রহণকারী শিক্ষার্থী" টেবিলে student এর real attempt দেখা উচিত

## এরপর কী

Step 7: Vercel Deploy — অপেক্ষা করো।

---

# Step 7: Vercel Deploy

## Deploy করার আগে ছোট্ট একটা check

- `SUPABASE_SERVICE_ROLE_KEY` (পুরো DB access, RLS bypass করে) শুধু server-side ফাইলে (`app/api/*`, admin dashboard/exams list পেজ) ব্যবহার হয় — কোনো `"use client"` কম্পোনেন্টে এই key যায় না। তাই এটা কখনো browser এ leak হবে না।
- `NEXT_PUBLIC_SUPABASE_URL` আর `NEXT_PUBLIC_SUPABASE_ANON_KEY` — এই দুইটা browser এ যাওয়াই স্বাভাবিক (Supabase নিজেই এভাবে ডিজাইন করেছে, RLS দিয়ে সুরক্ষিত), তাই চিন্তার কিছু নেই।

## করণীয়

### ১. সব কোড GitHub এ push করো

Step 1 এ যেই repo বানিয়েছিলে, সেখানে এখন পর্যন্ত হওয়া সব কাজ (Step 2-7) push করো:
```
git add .
git commit -m "Step 6+7: API routes, Supabase wiring, Vercel deploy ready"
git push
```
(যদি নতুন করে শুরু করো, Step 1 এর README এর "GitHub এ push করা" অংশ দেখো।)

### ২. Vercel এ account বানাও / লগইন করো

- https://vercel.com এ যাও, **"Continue with GitHub"** দিয়ে লগইন করো (তোমার GitHub account দিয়েই সবচেয়ে সহজ, repo import করতে সুবিধা হবে)

### ৩. Project Import করো

- Vercel Dashboard এ **"Add New..." → "Project"**
- তোমার `mcq-exam-app` repository টা লিস্টে দেখবে — **"Import"** ক্লিক করো
- Framework Preset এ এমনিতেই **"Next.js"** detect হয়ে যাবে — কিছু বদলানোর দরকার নেই
- Root Directory যদি জিজ্ঞেস করে আর তোমার repo এর ভিতরেই সরাসরি `app/`, `package.json` থাকে (Step 1 এর নির্দেশ অনুযায়ী থাকলে থাকবে) — root ("./") ঠিক আছে, বদলানোর দরকার নেই

### ৪. Environment Variables বসাও (সবচেয়ে গুরুত্বপূর্ণ ধাপ)

Import স্ক্রিনেই **"Environment Variables"** অংশ আছে (অথবা পরে Project → Settings → Environment Variables থেকে যোগ করা যায়)। তোমার `.env.local` ফাইলে যা আছে হুবহু তাই এখানে বসাও:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | তোমার `.env.local` থেকে কপি করো |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | তোমার `.env.local` থেকে কপি করো |
| `SUPABASE_SERVICE_ROLE_KEY` | তোমার `.env.local` থেকে কপি করো |

তিনটাই **Production, Preview, Development** — সব environment এ tick দিয়ে রাখো (default এ সবগুলোই tick করা থাকে, শুধু নিশ্চিত হও)।

### ৫. Deploy চাপো

- **"Deploy"** বাটনে ক্লিক করো — ২-৩ মিনিটের মধ্যে build শেষ হয়ে একটা লিংক দিবে, যেমন `https://mcq-exam-app-xxxx.vercel.app`

### ৬. Live সাইটে টেস্ট করো

README এর "Step 6 → যাচাই করবে কীভাবে" অংশে যেই টেস্টগুলো `localhost:3000` এ করেছিলে, সেগুলো এখন live URL দিয়ে আরেকবার করো:
- `/login` এ admin লগইন
- `/exams/new` দিয়ে exam বানানো, প্রশ্ন যোগ করা
- `/<exam-id>` দিয়ে student entry + exam দেওয়া + submit
- Auto-submit, result visibility — সব একইভাবে কাজ করা উচিত

### ৭. পরবর্তীতে কোনো কোড বদলালে

`main` ব্র্যাঞ্চে `git push` করলেই Vercel নিজে থেকে নতুন করে deploy করে দিবে — আলাদা কিছু করতে হবে না।

### ৮. (ঐচ্ছিক) নিজের ডোমেইন যোগ করা

Project → Settings → Domains এ গিয়ে তোমার নিজের ডোমেইন (যদি থাকে) যোগ করতে পারো — Vercel DNS instructions দেখাবে।

## এরপর কী

মূল প্রজেক্ট প্ল্যানের সব feature (Step 1-7) এখন সম্পূর্ণ। ভবিষ্যতে চাইলে যোগ করা যায়:
- Excel/CSV দিয়ে bulk প্রশ্ন import (প্রজেক্ট প্ল্যানে "future enhancement" হিসেবে উল্লেখ ছিল)
- একই ফোন নাম্বার ভুল করে টাইপ হলে admin থেকে manual attempt reset করার সুবিধা

---

# Step 8: Result Review + Phone-based Result Lookup

## সমস্যা কী ছিল

আগে result page শুধু localStorage এর উপর নির্ভর করত — মানে যেই ব্রাউজার/ডিভাইসে exam দিয়েছিল, ঠিক সেই ব্রাউজারে আবার গেলে তবেই result দেখা যেত। অন্য ডিভাইস/ব্রাউজার থেকে, বা browser data clear হয়ে গেলে — কোনোভাবে result দেখা যেত না। প্রশ্নভিত্তিক ভুল/ঠিক এর বিস্তারিতও দেখানো হতো না।

## এখন কী যোগ হলো

- **ফোন নাম্বার = student এর "account"।** এই প্রজেক্টে কোনো password/login সিস্টেম নেই (দরকারও নেই — school MCQ exam এর জন্য এটাই যথেষ্ট)। যেহেতু `attempts` টেবিলে প্রতিটা exam এ একটা ফোন নাম্বার একবারই ব্যবহার করা যায় (`unique(exam_id, student_phone)`), তাই ফোন নাম্বারটাই ওই student কে identify করার একমাত্র উপায়। Result দেখতে চাইলে exam শুরু করার সময় যেই ফোন নাম্বার দিয়েছিল, সেটা দিলেই server থেকে তার attempt খুঁজে বের করা হয় — কোনো আলাদা account/password বানাতে হয় না।
- **`GET /api/attempts/lookup?exam_id=&phone=`** — নতুন API, ফোন নাম্বার দিয়ে attempt খুঁজে বের করে।
- **`GET /api/attempts/[attemptId]/review`** — নতুন API, প্রতিটা প্রশ্নে student কী উত্তর দিয়েছিল, সঠিক উত্তর কী ছিল, ঠিক/ভুল/স্কিপ — সব বিস্তারিত দেয় (exam শেষ না হলে hidden, আগের result API এর মতোই)।
- **`/result`** — নতুন fix লিংক (`/exam` এর মতোই)। এখানে গেলে সবচেয়ে সাম্প্রতিক শেষ হওয়া exam এর জন্য ফোন নাম্বার দিয়ে result খোঁজার ফর্ম দেখাবে।
- **`/result/[examId]`** — submit করার পরপর যেই পেজে redirect হয়, সেটা এখনো আছে। localStorage এ attempt থাকলে সাথে সাথে দেখাবে, না থাকলে (অন্য ডিভাইস হলে) ফোন নাম্বার দিয়ে খোঁজার ফর্ম দেখাবে — দুটো পেজই একই `ResultLookup` কম্পোনেন্ট ব্যবহার করে।
- **Result এ এখন থাকে:** মোট নম্বর, শতকরা হার, সঠিক/ভুল/স্কিপ সংখ্যা (stat grid), "📋 উত্তরপত্র দেখো" বাটন চাপলে প্রতিটা প্রশ্নের বিস্তারিত (কোন option select করেছিল, সঠিক উত্তর কোনটা, ব্যাখ্যা থাকলে সেটাও), আর লিডারবোর্ড — সবসময় একসাথে (exam শেষ হওয়ার পর)।
- হোমপেজে (`/`) এখন "পরীক্ষা দিতে যাও" এর পাশে "ফলাফল দেখো" বাটনও আছে।

## যাচাই করবে কীভাবে

- একটা exam এর `end_time` অতীতে বসিয়ে দাও (Supabase Table Editor থেকে) — এমন একটা exam যেখানে কেউ পরীক্ষা দিয়ে জমা দিয়েছে
- ওই ব্রাউজার/ডিভাইসেই localStorage clear করে (বা আরেকটা browser/incognito থেকে) `/result` এ যাও — ফোন নাম্বার চাইবে
- সেই student এর ফোন নাম্বার দাও — score, breakdown, leaderboard সব দেখা উচিত
- "উত্তরপত্র দেখো" চাপলে প্রতিটা প্রশ্নে সবুজ (সঠিক)/লাল (ভুল)/ধূসর (স্কিপ) badge সহ বিস্তারিত দেখা উচিত
