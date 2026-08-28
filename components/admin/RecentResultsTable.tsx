import Table from "@/components/ui/Table";
import { formatDateTime } from "@/lib/utils";

// dashboard/page.tsx এর join query (attempts + exams.title) থেকে normalize করা row shape —
// existing Attempt type (types/index.ts) এ exam_id/submitted_at নেই বলে আলাদা টাইপ,
// existing টাইপ পাল্টানো হয়নি
export interface RecentResult {
  id: string;
  student_name: string;
  exam_title: string;
  score: number | null;
  total_questions: number | null;
  submitted_at: string;
}

interface RecentResultsTableProps {
  results: RecentResult[];
}

export default function RecentResultsTable({ results }: RecentResultsTableProps) {
  return (
    <Table
      rowKey={(r) => r.id}
      emptyMessage="এখনো কোনো ফলাফল জমা হয়নি"
      columns={[
        { header: "শিক্ষার্থী", accessor: (r) => r.student_name },
        { header: "পরীক্ষা", accessor: (r) => r.exam_title },
        {
          header: "স্কোর",
          accessor: (r) => (r.score !== null ? `${r.score}/${r.total_questions}` : "—"),
        },
        {
          header: "জমা দেওয়া হয়েছে",
          accessor: (r) => formatDateTime(r.submitted_at),
        },
      ]}
      data={results}
    />
  );
}
