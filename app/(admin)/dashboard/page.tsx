import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import StatsCard from "@/components/admin/StatsCard";
import RecentResultsTable, { type RecentResult } from "@/components/admin/RecentResultsTable";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExamWindowStatus } from "@/lib/time";
import type { Exam } from "@/types";

// middleware.ts আগেই এই route protect করে (login ছাড়া আসা যায় না),
// তাই server component সরাসরি admin client দিয়ে data আনতে পারে।
export const dynamic = "force-dynamic";

// bucketing এর জন্য শুধু দরকারি কলাম — getExamWindowStatus এর ইনপুট শেপের সাথে মিলিয়ে
type ExamWindowRow = Pick<Exam, "status" | "start_time" | "end_time">;

// attempts + exams(title) join এর raw row shape — Supabase relationship inference
// অনুযায়ী `exams` object অথবা array যেকোনোটাই আসতে পারে, তাই দুটোই handle করা হলো।
// এটা existing Attempt টাইপ (types/index.ts) থেকে আলাদা — ওই টাইপ পাল্টানো হয়নি।
interface RawRecentResultRow {
  id: string;
  student_name: string;
  score: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  exams: { title: string } | { title: string }[] | null;
}

function extractExamTitle(exams: RawRecentResultRow["exams"]): string {
  if (!exams) return "—";
  if (Array.isArray(exams)) return exams[0]?.title ?? "—";
  return exams.title ?? "—";
}

function toRecentResult(row: RawRecentResultRow): RecentResult {
  return {
    id: row.id,
    student_name: row.student_name,
    exam_title: extractExamTitle(row.exams),
    score: row.score,
    total_questions: row.total_questions,
    // .not("submitted_at", "is", null) দিয়ে ফিল্টার করা হয়েছে, তাই এই রো-গুলোতে
    // submitted_at সবসময় থাকবে — তবু টাইপের জন্য defensive fallback
    submitted_at: row.submitted_at ?? "",
  };
}

export default async function DashboardPage() {
  const supabase = createAdminClient();

  const [{ count: totalExams }, { data: attempts }, { data: examWindows }, { data: recentRows }] =
    await Promise.all([
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase.from("attempts").select("submitted_at"),
      supabase.from("exams").select("status, start_time, end_time"),
      supabase
        .from("attempts")
        .select("id, student_name, score, total_questions, submitted_at, exams(title)")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(10),
    ]);

  const totalAttempts = attempts?.length ?? 0;
  const completed = attempts?.filter((a) => a.submitted_at).length ?? 0;

  // ৪টা bucket পরস্পর exclusive এবং getExamWindowStatus প্রতিটা exam কে ঠিক একটাতেই
  // ফেলে — তাই আলাদা date-comparison logic লেখার দরকার নেই
  const windowCounts = ((examWindows ?? []) as ExamWindowRow[]).reduce(
    (acc, exam) => {
      const status = getExamWindowStatus(exam);
      acc[status] += 1;
      return acc;
    },
    { active: 0, not_started: 0, ended: 0, not_published: 0 }
  );

  const recentResults: RecentResult[] = ((recentRows ?? []) as RawRecentResultRow[]).map(toRecentResult);

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">ড্যাশবোর্ড</h1>
        <Link href="/exams/new">
          <Button>নতুন পরীক্ষা তৈরি করো</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard label="মোট পরীক্ষা" value={totalExams ?? 0} />
        <StatsCard label="মোট অংশগ্রহণকারী" value={totalAttempts} />
        <StatsCard label="জমা সম্পন্ন" value={completed} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatsCard label="লাইভ" value={windowCounts.active} />
        <StatsCard label="আসন্ন" value={windowCounts.not_started} />
        <StatsCard label="শেষ" value={windowCounts.ended} />
        <StatsCard label="খসড়া" value={windowCounts.not_published} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">সাম্প্রতিক ফলাফল</h2>
        <RecentResultsTable results={recentResults} />
      </div>
    </AdminShell>
  );
}
