import { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import ExamStatusBadge from "@/components/admin/ExamStatusBadge";
import ExamTabs from "@/components/admin/ExamTabs";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import type { Exam } from "@/types";

type ExamHeaderRow = Pick<
  Exam,
  "id" | "title" | "status" | "start_time" | "end_time" | "duration_minutes"
>;

export default async function ExamDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { examId: string };
}) {
  const supabase = createAdminClient();
  const { data: exam, error } = await supabase
    .from("exams")
    .select("id, title, status, start_time, end_time, duration_minutes")
    .eq("id", params.examId)
    .single<ExamHeaderRow>();

  if (error || !exam) {
    return (
      <AdminShell>
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-medium">পরীক্ষা পাওয়া যায়নি</p>
          <p className="mt-1 text-sm">{error?.message ?? "এই আইডির কোনো পরীক্ষা নেই"}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">{exam.title}</h1>
          <ExamStatusBadge exam={exam} />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          শুরু: {formatDateTime(exam.start_time)} · শেষ: {formatDateTime(exam.end_time)} · সময়কাল:{" "}
          {exam.duration_minutes} মিনিট
        </p>
      </div>
      <ExamTabs examId={exam.id} />
      <div className="mt-6">{children}</div>
    </AdminShell>
  );
}
