import { cn } from "@/lib/utils";
import { NOTICE_CATEGORY_LABELS, NOTICE_CATEGORY_BADGE_CLASSES } from "@/lib/noticeCategory";
import type { NoticeCategory } from "@/types";

interface NoticeCategoryBadgeProps {
  category: NoticeCategory;
  className?: string;
}

// ExamStatusBadge এর সাথে একই visual shape — admin notice list (Step 4) আর
// public notice card/ticker (Step 5-6) দুই জায়গাতেই ব্যবহার হয় বলে
// components/shared/ এ রাখা হলো (AutoRefresh.tsx এর মতোই একই convention —
// admin-only বা coaching-only না, দুই দিকেই common)
export default function NoticeCategoryBadge({ category, className }: NoticeCategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        NOTICE_CATEGORY_BADGE_CLASSES[category],
        className
      )}
    >
      {NOTICE_CATEGORY_LABELS[category]}
    </span>
  );
}
