import Table from "@/components/ui/Table";
import ExportCsvButton, { type ExportCsvRow } from "@/components/admin/ExportCsvButton";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ResultRow {
  id: string;
  student_name: string;
  student_phone: string;
  student_institution: string;
  score: number | null;
  total_questions: number | null;
  submitted_at: string;
}

interface RankedRow extends ResultRow {
  rank: number;
  percentage: number | null;
}

export default async function ExamResultsPage({ params }: { params: { examId: string } }) {
  const supabase = createAdminClient();

  const [{ data: examData }, { data: attemptRows }] = await Promise.all([
    supabase.from("exams").select("title").eq("id", params.examId).single(),
    supabase
      .from("attempts")
      .select("id, student_name, student_phone, student_institution, score, total_questions, submitted_at")
      .eq("exam_id", params.examId)
      .not("submitted_at", "is", null)
      .order("score", { ascending: false })
      .returns<ResultRow[]>(),
  ]);

  const examTitle = examData?.title ?? "";
  const rows = attemptRows ?? [];

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center text-ink-soft font-body">
        এখনো কোনো ফলাফল জমা হয়নি
      </div>
    );
  }

  const rankedRows: RankedRow[] = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    percentage:
      row.total_questions && row.total_questions > 0 && row.score !== null
        ? Math.round((row.score / row.total_questions) * 1000) / 10
        : null,
  }));

  const exportRows: ExportCsvRow[] = rankedRows.map((row) => ({
    rank: row.rank,
    student_name: row.student_name,
    student_phone: row.student_phone,
    student_institution: row.student_institution,
    score: row.score,
    total_questions: row.total_questions,
    percentage: row.percentage,
    submitted_at: row.submitted_at,
  }));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">ফলাফল</h2>
        <ExportCsvButton examTitle={examTitle} examId={params.examId} rows={exportRows} />
      </div>
      <Table
        rowKey={(row: RankedRow) => row.id}
        columns={[
          { header: "Rank", accessor: (row: RankedRow) => row.rank },
          { header: "নাম", accessor: (row: RankedRow) => row.student_name },
          { header: "ফোন", accessor: (row: RankedRow) => row.student_phone },
          { header: "স্কুল/কলেজ", accessor: (row: RankedRow) => row.student_institution || "—" },
          {
            header: "স্কোর",
            accessor: (row: RankedRow) =>
              row.score !== null ? `${row.score}/${row.total_questions}` : "—",
          },
          {
            header: "শতকরা",
            accessor: (row: RankedRow) => (row.percentage !== null ? `${row.percentage}%` : "—"),
          },
          {
            header: "জমা দেওয়ার সময়",
            accessor: (row: RankedRow) => formatDateTime(row.submitted_at),
          },
        ]}
        data={rankedRows}
      />
    </>
  );
}
