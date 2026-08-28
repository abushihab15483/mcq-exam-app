// GET /api/attempts/[attemptId]/review — কোন প্রশ্নে ভুল/ঠিক হয়েছে তার বিস্তারিত।
// exam এর end_time পার না হলে দেখানো হয় না (result এর মতোই gated)।
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { verifyResultAccessToken } from "@/lib/resultAccessToken";
import type { OptionKey } from "@/types";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REVIEW_LIMIT = 60;
const REVIEW_WINDOW_MS = 60_000; // ১ মিনিট

export async function GET(request: Request, { params }: { params: { attemptId: string } }) {
  const rl = await checkRateLimit(`attempt-review:${params.attemptId}`, REVIEW_LIMIT, REVIEW_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  // এই endpoint correct_option সহ পুরো প্রশ্নপত্র দেয় — attempt_id একা (UUID
  // guess/leak/shared-link) দিয়ে যাতে কেউ অন্য student এর answer key দেখতে না
  // পারে, তাই signed result access token বাধ্যতামূলক (একই token যেটা
  // attempt-detail endpoint এও লাগে — exam-session token থেকে আলাদা concept)।
  const token = new URL(request.url).searchParams.get("token");
  if (!verifyResultAccessToken(token, params.attemptId)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, exam_id, submitted_at")
    .eq("id", params.attemptId)
    .single();

  if (error || !attempt) {
    return Response.json({ error: "attempt পাওয়া যায়নি" }, { status: 404 });
  }

  const { data: exam } = await supabase.from("exams").select("end_time").eq("id", attempt.exam_id).single();
  const ended = exam ? new Date(exam.end_time).getTime() <= Date.now() : true;

  if (!ended) {
    return Response.json({ visible: false });
  }

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, order_index")
      .eq("exam_id", attempt.exam_id)
      .order("order_index", { ascending: true }),
    supabase.from("answers").select("question_id, selected_option").eq("attempt_id", params.attemptId),
  ]);

  const answerMap = new Map<string, OptionKey | null>(
    (answers ?? []).map((a) => [a.question_id, a.selected_option as OptionKey | null])
  );

  const review = (questions ?? []).map((q) => {
    const selected = answerMap.get(q.id) ?? null;
    return {
      id: q.id,
      question_text: q.question_text,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      },
      correct_option: q.correct_option as OptionKey,
      selected_option: selected,
      is_correct: selected !== null && selected === q.correct_option,
      is_skipped: selected === null,
      explanation: q.explanation,
    };
  });

  return Response.json({ visible: true, review });
}
