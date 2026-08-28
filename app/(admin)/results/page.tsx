import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import Table from "@/components/ui/Table";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ExamListRow {
  id: string;
  title: string;
  status: string;
  start_time: string;
}

export default async function ResultsPickerPage() {
  const supabase = createAdminClient();
  const { data: exams, error } = await supabase
    .from("exams")
    .select("id, title, status, start_time")
    .order("start_time", { ascending: false })
    .returns<ExamListRow[]>();

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">ফলাফল</h1>
      </div>
      {error ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-medium">তথ্য লোড করতে সমস্যা হয়েছে</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <p className="mt-2 text-sm text-ink-soft">
            ইন্টারনেট কানেকশন চেক করো, অথবা পেজ রিফ্রেশ করে আবার চেষ্টা করো।
          </p>
        </div>
      ) : (
        <Table
          rowKey={(exam: ExamListRow) => exam.id}
          emptyMessage="এখনো কোনো পরীক্ষা তৈরি করা হয়নি"
          columns={[
            { header: "নাম", accessor: (exam: ExamListRow) => exam.title },
            { header: "শুরু", accessor: (exam: ExamListRow) => formatDateTime(exam.start_time) },
            {
              header: "কাজ",
              accessor: (exam: ExamListRow) => (
                <Link href={`/exams/${exam.id}/results`}>
                  <Button variant="outline" size="sm">
                    ফলাফল দেখো
                  </Button>
                </Link>
              ),
            },
          ]}
          data={exams ?? []}
        />
      )}
    </AdminShell>
  );
}
