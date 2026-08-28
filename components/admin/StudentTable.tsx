import Table from "@/components/ui/Table";
import type { Attempt } from "@/types";
import { formatDateTime } from "@/lib/utils";

interface StudentTableProps {
  attempts: Attempt[];
}

export default function StudentTable({ attempts }: StudentTableProps) {
  return (
    <Table
      rowKey={(a) => a.id}
      emptyMessage="এখনো কেউ পরীক্ষা দেয়নি"
      columns={[
        { header: "নাম", accessor: (a) => a.student_name },
        { header: "ফোন", accessor: (a) => a.student_phone },
        { header: "স্কুল/কলেজ", accessor: (a) => a.student_institution || "—" },
        {
          header: "স্কোর",
          accessor: (a) => (a.score !== null ? `${a.score}/${a.total_questions}` : "চলছে..."),
        },
        {
          header: "শুরু হয়েছে",
          accessor: (a) => formatDateTime(a.started_at),
        },
      ]}
      data={attempts}
    />
  );
}
