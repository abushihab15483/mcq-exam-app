// GET /api/attempts/[attemptId] — student নিজের result দেখার জন্য (result page ব্যবহার করে)
// exam এর end_time পার না হলে score দেখানো হয় না (visible: false)
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { verifyResultAccessToken } from "@/lib/resultAccessToken";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// attempt_id দিয়ে key (IP দিয়ে না) — এটা student এর নিজের result page, যেটা
// বার বার re-render/poll হতে পারে (review টগল করা ইত্যাদি); IP দিয়ে limit করলে
// শেয়ার্ড ল্যাবে অন্য student রা প্রভাবিত হতো। এই limit মূলত defense-in-depth,
// যদি কোনোভাবে একটা attempt_id leak/share হয় সেটা যাতে অসীমবার hammer করা না যায়
const RESULT_LIMIT = 60;
const RESULT_WINDOW_MS = 60_000; // ১ মিনিট

export async function GET(request: Request, { params }: { params: { attemptId: string } }) {
  const rl = await checkRateLimit(`attempt-detail:${params.attemptId}`, RESULT_LIMIT, RESULT_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  // attempt_id একা এখন আর যথেষ্ট প্রমাণ না — সাবমিট করার পর বা phone+name দিয়ে
  // lookup verify করার পর যেই independent, short-lived result access token
  // পাওয়া যায়, সেটাও লাগবে (দেখো lib/resultAccessToken.ts — exam-session
  // token থেকে সম্পূর্ণ আলাদা concept, exam এর deadline এর সাথে কোনো
  // সম্পর্ক নেই)। token ছাড়া/ভুল/expired token দিয়ে UUID guess/leak করেও
  // কারো result দেখা যাবে না — expired হলেও ফলাফল হারায় না, শুধু আবার
  // phone+name দিয়ে lookup করলেই (app/api/attempts/lookup) নতুন token পাওয়া
  // যায়।
  const token = new URL(request.url).searchParams.get("token");
  if (!verifyResultAccessToken(token, params.attemptId)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, exam_id, student_name, student_institution, score, total_questions, started_at, submitted_at")
    .eq("id", params.attemptId)
    .single();

  if (error || !attempt) {
    return Response.json({ error: "attempt পাওয়া যায়নি" }, { status: 404 });
  }

  const { data: exam } = await supabase.from("exams").select("end_time").eq("id", attempt.exam_id).single();

  const ended = exam ? new Date(exam.end_time).getTime() <= Date.now() : true;

  if (!ended) {
    return Response.json({ visible: false, submitted: !!attempt.submitted_at });
  }

  const durationSeconds = attempt.submitted_at
    ? Math.max(0, Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 1000))
    : null;

  return Response.json({
    visible: true,
    submitted: !!attempt.submitted_at,
    student_name: attempt.student_name,
    student_institution: attempt.student_institution,
    score: attempt.score,
    total: attempt.total_questions,
    duration_seconds: durationSeconds,
  });
}
