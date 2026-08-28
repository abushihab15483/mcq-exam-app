import StatsCard from "@/components/admin/StatsCard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AttemptStatsRow {
  score: number | null;
  submitted_at: string | null;
}

export default async function ExamOverviewPage({ params }: { params: { examId: string } }) {
  const supabase = createAdminClient();

  const [{ count: questionCount }, { data: attempts }] = await Promise.all([
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", params.examId),
    supabase
      .from("attempts")
      .select("score, submitted_at")
      .eq("exam_id", params.examId)
      .returns<AttemptStatsRow[]>(),
  ]);

  const attemptRows = attempts ?? [];
  const participants = attemptRows.length;
  const submittedRows = attemptRows.filter((a) => a.submitted_at);
  const submitted = submittedRows.length;

  const scored = submittedRows.filter((a) => a.score !== null);
  const averageScore =
    scored.length > 0
      ? (scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length).toFixed(1)
      : "—";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard label="প্রশ্ন সংখ্যা" value={questionCount ?? 0} />
      <StatsCard label="অংশগ্রহণকারী" value={participants} />
      <StatsCard label="জমা সম্পন্ন" value={submitted} />
      <StatsCard label="গড় স্কোর" value={averageScore} />
    </div>
  );
}
