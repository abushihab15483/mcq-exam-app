// GET /api/leaderboard/[examId] — rank সহ leaderboard।
// filter + ranking (score DESC, duration ASC) Postgres RPC leaderboard_for_exam()
// এ হয় (দেখো supabase/step11-leaderboard-rpc.sql) — একই score হলে যে কম সময়ে
// (started_at থেকে submitted_at পর্যন্ত) পরীক্ষা শেষ করেছে তার rank আগে — কে আগে
// "সাবমিট বাটনে ক্লিক করেছে" সেটা না, বরং কে আসলে কম সময় ব্যয় করেছে সেটাই গুরুত্বপূর্ণ
// (পরে শুরু করে কম সময়ে শেষ করলেও উপরে থাকবে)।
// exam এর end_time পার না হওয়া পর্যন্ত hidden (project plan: "Hidden until exam end time")
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// IP rate-limit window (API abuse প্রতিরোধ) — leaderboard এ কয়টা row দেখানো হবে
// তার সাথে এর সম্পর্ক নেই, সেটা আলাদা LEADERBOARD_ROW_LIMIT (নিচে)
const RATE_LIMIT_MAX_REQUESTS = 60;
const LEADERBOARD_WINDOW_MS = 60_000; // ১ মিনিট

// DB-level Top-N — RPC কে পাঠানো হয়, JS-এ slice করা হয় না (দেখো
// supabase/step12-leaderboard-limit-index.sql)। UI তে pagination নেই, তাই
// এটাই leaderboard এ প্রকৃত row সংখ্যা।
const LEADERBOARD_ROW_LIMIT = 60;

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`leaderboard:${ip}:${params.examId}`, RATE_LIMIT_MAX_REQUESTS, LEADERBOARD_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();

  const { data: exam } = await supabase.from("exams").select("end_time").eq("id", params.examId).single();
  const ended = exam ? new Date(exam.end_time).getTime() <= Date.now() : true;

  if (!ended) {
    return Response.json({ visible: false, rows: [] });
  }

  const { data, error } = await supabase.rpc("leaderboard_for_exam", {
    p_exam_id: params.examId,
    p_limit: LEADERBOARD_ROW_LIMIT,
  });

  if (error) {
    return Response.json({ error: "লিডারবোর্ড লোড করা যায়নি" }, { status: 500 });
  }

  // ranking (filter + score DESC, duration ASC order) leaderboard_for_exam()
  // এ Postgres-এ হয়ে গেছে (দেখো supabase/step11-leaderboard-rpc.sql) —
  // এখানে শুধু ইতিমধ্যে-ordered রেজাল্টে rank বসানো হচ্ছে, কোনো sort নেই
  const rows = (data ?? []).map((row: { student_name: string; score: number; total_questions: number; duration_seconds: number }, i: number) => ({
    rank: i + 1,
    student_name: row.student_name,
    score: row.score,
    total: row.total_questions,
    duration_seconds: row.duration_seconds,
  }));

  return Response.json({ visible: true, rows });
}
