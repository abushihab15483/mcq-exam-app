import { getExamWindowStatus } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Exam } from "@/types";

interface ExamStatusBadgeProps {
  exam: Pick<Exam, "status" | "start_time" | "end_time">;
}

export default function ExamStatusBadge({ exam }: ExamStatusBadgeProps) {
  const status = getExamWindowStatus(exam);

  const config = {
    active: { label: "লাইভ", className: "border-success/30 bg-success/10 text-success" },
    not_started: { label: "আসন্ন", className: "border-border text-ink-soft" },
    ended: { label: "শেষ", className: "border-border text-ink-faint" },
    not_published: { label: "খসড়া", className: "border-border text-ink-soft" },
  } as const;

  const { label, className } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}
