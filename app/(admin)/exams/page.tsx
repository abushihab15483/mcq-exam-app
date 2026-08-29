import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import DeleteExamButton from "@/components/admin/DeleteExamButton";
import Table from "@/components/ui/Table";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import type { Exam } from "@/types";

export const dynamic = "force-dynamic";

export default async function ExamsListPage() {
  const supabase = createAdminClient();
  const { data: exams, error } = await supabase
    .from("exams")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">পরীক্ষাসমূহ</h1>
        <Link href="/exams/new">
          <Button>নতুন পরীক্ষা তৈরি করো</Button>
        </Link>
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
        rowKey={(exam: Exam) => exam.id}
        emptyMessage="এখনো কোনো পরীক্ষা তৈরি করা হয়নি"
        columns={[
          { header: "নাম", accessor: (exam: Exam) => exam.title },
          { header: "অবস্থা", accessor: (exam: Exam) => exam.status },
          { header: "শুরু", accessor: (exam: Exam) => formatDateTime(exam.start_time) },
          {
            header: "কাজ",
            accessor: (exam: Exam) => (
              <div className="flex gap-2">
                <Link href={`/exams/${exam.id}/edit`}>
                  <Button variant="outline" size="sm">
                    এডিট
                  </Button>
                </Link>
                <Link href={`/exams/${exam.id}/questions`}>
                  <Button variant="outline" size="sm">
                    প্রশ্ন দেখো
                  </Button>
                </Link>
                <DeleteExamButton examId={exam.id} examTitle={exam.title} />
              </div>
            ),
          },
        ]}
        data={exams ?? []}
      />
      )}
    </AdminShell>
  );
}
