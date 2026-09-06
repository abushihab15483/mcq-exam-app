import NoticeCategoryBadge from "@/components/shared/NoticeCategoryBadge";
import { formatDateTime } from "@/lib/utils";
import { isRecentlyPublishedNotice } from "@/lib/noticeCategory";
import type { PublicNotice } from "@/types";

interface NoticeCardProps {
  notice: PublicNotice;
  // "full" — /notice page আর homepage summary (Step 6) এ ব্যবহার হবে।
  // "compact" — header ticker (Step 6) এ একটা লাইনে দেখানোর জন্য, কোনো
  // content preview/attachment বাটন/তারিখ থাকবে না, শুধু category + title।
  variant?: "full" | "compact";
}

function isPdfAttachment(url: string): boolean {
  return url.toLowerCase().endsWith(".pdf");
}

// FINAL PLAN: "attachment থাকলে card এ 'PDF/ছবি দেখুন' বাটন, না থাকলে কোনো
// action বাটন না" — টাইপ অনুযায়ী label আলাদা (PDF নাকি ছবি) যাতে ক্লিক করার
// আগেই বোঝা যায় কী খুলবে
export default function NoticeCard({ notice, variant = "full" }: NoticeCardProps) {
  if (variant === "compact") {
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <NoticeCategoryBadge category={notice.category} className="shrink-0" />
        <span className="truncate text-sm font-medium text-ink">{notice.title}</span>
      </div>
    );
  }

  const attachmentLabel = notice.attachment_url
    ? isPdfAttachment(notice.attachment_url)
      ? "PDF দেখুন"
      : "ছবি দেখুন"
    : null;
  // FINAL PLAN Step 7 — publish_at থেকে ৭২ ঘণ্টার মধ্যে হলে "নতুন" ব্যাজ
  const isNew = isRecentlyPublishedNotice(notice.publish_at);

  return (
    <div className="rounded-card border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <NoticeCategoryBadge category={notice.category} />
        {notice.is_pinned && <span className="text-xs font-medium text-gold">📌 পিন করা</span>}
        {isNew && <span className="text-xs font-medium text-success">✨ নতুন</span>}
      </div>

      <h3 className="mt-3 font-display text-base font-semibold leading-snug text-ink">
        {notice.title}
      </h3>

      {notice.content && (
        <p className="mt-2 line-clamp-3 text-sm leading-[1.7] text-ink-soft">{notice.content}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-ink-faint">{formatDateTime(notice.publish_at)}</span>
        {attachmentLabel && notice.attachment_url && (
          <a
            href={notice.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold underline decoration-gold/40 decoration-2 underline-offset-4 hover:decoration-gold"
          >
            {attachmentLabel}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7M17 7H8M17 7v9" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
