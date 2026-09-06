import Link from "next/link";
import { Button } from "@/components/ui";
import NoticeCategoryBadge from "@/components/shared/NoticeCategoryBadge";
import PinToggleButton from "./PinToggleButton";
import DeleteNoticeButton from "./DeleteNoticeButton";
import { formatDateTime, cn } from "@/lib/utils";
import type { Notice } from "@/types";

interface NoticeListProps {
  notices: Notice[];
}

// FINAL PLAN Step 4: "মোবাইল এ card/list" — এখানকার Table কম্পোনেন্ট (বাকি
// admin page গুলোতে ব্যবহৃত) শুধু horizontal scroll করে, notice এর মতো
// বেশি তথ্যওয়ালা row মোবাইলে পড়া কঠিন হয়ে যায়। তাই এখানে desktop এ table,
// মোবাইলে stacked card — দুটো আলাদা layout একই data দিয়ে render হচ্ছে
// (Tailwind এর hidden/md:block দিয়ে টগল, কোনো JS লাগছে না)।
export default function NoticeList({ notices }: NoticeListProps) {
  if (notices.length === 0) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center text-ink-soft font-body">
        এখনো কোনো নোটিশ তৈরি করা হয়নি
      </div>
    );
  }

  return (
    <>
      {/* মোবাইল/ট্যাবলেট: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-card border border-border bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-ink">{notice.title}</h3>
              {notice.is_pinned && (
                <span className="shrink-0 text-xs font-medium text-gold">📌 পিন করা</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <NoticeCategoryBadge category={notice.category} />
              <StatusBadge status={notice.status} />
            </div>
            <p className="mt-2 text-xs text-ink-soft">প্রকাশ: {formatDateTime(notice.publish_at)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/notices/${notice.id}/edit`}>
                <Button variant="outline" size="sm">
                  এডিট
                </Button>
              </Link>
              <PinToggleButton notice={notice} />
              <DeleteNoticeButton noticeId={notice.id} noticeTitle={notice.title} />
            </div>
          </div>
        ))}
      </div>

      {/* ডেস্কটপ: table */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-white md:block">
        <table className="w-full text-left font-body">
          <thead>
            <tr className="border-b border-border bg-black/[0.02]">
              <th className="px-4 py-3 text-sm font-medium text-ink-soft">শিরোনাম</th>
              <th className="px-4 py-3 text-sm font-medium text-ink-soft">ক্যাটাগরি</th>
              <th className="px-4 py-3 text-sm font-medium text-ink-soft">অবস্থা</th>
              <th className="px-4 py-3 text-sm font-medium text-ink-soft">প্রকাশ</th>
              <th className="px-4 py-3 text-sm font-medium text-ink-soft">কাজ</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-ink">
                  <div className="flex items-center gap-2">
                    {notice.is_pinned && <span title="পিন করা">📌</span>}
                    {notice.title}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <NoticeCategoryBadge category={notice.category} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={notice.status} />
                </td>
                <td className="px-4 py-3 text-sm text-ink">{formatDateTime(notice.publish_at)}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/notices/${notice.id}/edit`}>
                      <Button variant="outline" size="sm">
                        এডিট
                      </Button>
                    </Link>
                    <PinToggleButton notice={notice} />
                    <DeleteNoticeButton noticeId={notice.id} noticeTitle={notice.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: Notice["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        status === "published" ? "border-success/30 bg-success/10 text-success" : "border-border text-ink-soft"
      )}
    >
      {status === "published" ? "প্রকাশিত" : "খসড়া"}
    </span>
  );
}
