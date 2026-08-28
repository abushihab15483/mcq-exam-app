// GET /api/exams/[examId]/questions — student exam স্ক্রিনের জন্য প্রশ্ন আনে,
// correct_option/explanation ছাড়া (leak প্রতিরোধ)। Exam এর title/duration ও সাথে দেয়।
//
// Security fix: আগে শুধু examId দিয়েই questions পাওয়া যেতো — exam শুরু হওয়ার
// আগে, শেষ হয়ে যাওয়ার পরে, এমনকি কোনো attempt ছাড়াই (কেউ সরাসরি examId
// জেনে/guess করে) প্রশ্ন scrape করা যেতো। এখন থেকে caller কে প্রমাণ দিতে হবে যে
// তার এই exam এর একটা বৈধ, চলমান (active, submit না-হওয়া) attempt আছে —
// attempt_id দিয়ে, ঠিক যেভাবে /api/submit এ attempt_id কে "এই student এর নিজের
// attempt" এর প্রমাণ হিসেবে ব্যবহার করা হয় (এই app এ আলাদা login/session নেই,
// attempt তৈরির সময়ই attempt_id student এর browser এ যায় — সেটাই এখানে বেয়ারার
// ক্যাপাবিলিটি হিসেবে reuse করা হচ্ছে, নতুন কোনো auth system বানানো হয়নি)।
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { getExamWindowStatus, computeAttemptDeadline } from "@/lib/time";
import { verifyExamSessionToken } from "@/lib/examSessionToken";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// আগে key ছিল `questions:${ip}:${examId}` — শেয়ার্ড স্কুল/ল্যাব IP তে একই
// exam এর ৩০-৪০ জন student একই bucket শেয়ার করতো, ফলে কয়েকজনের সাধারণ
// reload/retry-ই বাকি সবাইকে 429 দিয়ে আটকে দিতো (classroom false positive)।
// এই route এমনিতেই attempt_id বাধ্যতামূলক করে আর নিচে verify করে (belongs to
// এই exam, submit হয়নি, deadline পার হয়নি) — তাই এটাই স্বাভাবিক per-student
// identifier, আলাদা কোনো lookup/query ছাড়াই। এক IP তে অনেক student থাকলেও
// প্রত্যেকের attempt_id আলাদা, তাই bucket আলাদা।
const QUESTIONS_LIMIT = 30;
const QUESTIONS_WINDOW_MS = 60_000; // ১ মিনিট

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  const url = new URL(request.url);
  const attemptId = url.searchParams.get("attempt_id");
  const token = url.searchParams.get("token");
  // attempt_id ছাড়া request malformed/unauthorized — rate-limit bucket খরচ
  // করার আগেই বাতিল, নাহলে attempt_id-বিহীন junk request দিয়ে কারো bucket
  // (বা সবার জন্য একটা shared "no attempt_id" bucket) নষ্ট করা যেত
  if (!attemptId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // শুধু attempt_id জানা (guess/leak) যথেষ্ট না প্রশ্ন পড়ার জন্য — attempt
  // তৈরির সময় ইস্যু হওয়া exam-session token বাধ্যতামূলক। এই token এর নিজস্ব
  // expiry attempt এর effective deadline এর সাথে বাঁধা, কিন্তু আসল
  // authoritative deadline check নিচেই আলাদাভাবে (DB এর সময় দিয়ে) হয় —
  // token শুধু "এই attempt_id টা আসলেই এই student এর, guess করা না" প্রমাণ করে।
  if (!verifyExamSessionToken(token, attemptId)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`questions:${attemptId}`, QUESTIONS_LIMIT, QUESTIONS_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, title, duration_minutes, start_time, end_time, status")
    .eq("id", params.examId)
    .single();

  if (examError || !exam) {
    return Response.json({ error: "পরীক্ষা পাওয়া যায়নি" }, { status: 404 });
  }

  // exam published কিনা, আর server time অনুযায়ী start_time/end_time এর মধ্যে
  // কিনা — সব server-side, browser clock এর উপর কোনো ভরসা নেই
  // (getExamWindowStatus নিজেই server এর ঘড়ি ব্যবহার করে)
  const windowStatus = getExamWindowStatus(exam);
  if (windowStatus !== "active") {
    return Response.json({ error: "এই মুহূর্তে প্রশ্ন দেখা যাবে না" }, { status: 403 });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, exam_id, started_at, submitted_at")
    .eq("id", attemptId)
    .single();

  // attempt না থাকলে, বা এই exam এর না হলে (অন্য exam এর attempt_id দিয়ে এই
  // exam এর প্রশ্ন পড়ার চেষ্টা) — একই generic 403, কোনটা ভুল তা বলা হয় না
  if (attemptError || !attempt || attempt.exam_id !== exam.id) {
    return Response.json({ error: "unauthorized" }, { status: 403 });
  }

  // ইতিমধ্যে submit হয়ে গেছে এমন attempt দিয়ে আর নতুন করে প্রশ্ন পড়া যাবে না —
  // exam-taking phase তার জন্য শেষ
  if (attempt.submitted_at) {
    return Response.json({ error: "এই attempt ইতিমধ্যে জমা দেওয়া হয়েছে" }, { status: 403 });
  }

  // এই attempt এর নিজের authoritative deadline — MIN(started_at + duration,
  // exam.end_time), ঠিক /api/submit এর RPC যেভাবে হিসাব করে সেই একই নিয়মে।
  // Server এর নিজের ঘড়ি (Date.now()) ব্যবহার হচ্ছে, client/browser এর টাইমার না।
  const deadline = computeAttemptDeadline(attempt.started_at, exam.duration_minutes, exam.end_time);
  if (Date.now() > deadline) {
    return Response.json({ error: "এই attempt এর সময় শেষ হয়ে গেছে" }, { status: 403 });
  }

  const { data: questions, error } = await supabase
    .from("questions")
    // correct_option, explanation ইচ্ছাকৃতভাবে select এ নেই; exam_id/order_index/
    // created_at ও client এ ব্যবহার হয় না (order_index শুধু .order() এর জন্য
    // লাগে, select এ থাকা লাগে না — কলাম দিয়ে order করা যায় select না করেও)
    .select("id, question_text, option_a, option_b, option_c, option_d")
    .eq("exam_id", params.examId)
    .order("order_index", { ascending: true });

  if (error) {
    return Response.json({ error: "প্রশ্ন লোড করা যায়নি" }, { status: 500 });
  }

  // client (exam page) শুধু title আর end_time ব্যবহার করে (দেখো
  // app/(public)/exam/[examId]/page.tsx) — id/duration_minutes/start_time/status
  // এখানে শুধু server-side window-check/deadline হিসাবের জন্য লাগে, response এ না
  return Response.json({
    exam: { title: exam.title, end_time: exam.end_time },
    questions: questions ?? [],
  });
}
