"use client";

import { useState } from "react";
import NoticeCard from "./NoticeCard";
import { NOTICE_CATEGORY_OPTIONS } from "@/lib/noticeCategory";
import { cn } from "@/lib/utils";
import type { NoticeCategory, PublicNotice } from "@/types";

interface NoticeBoardProps {
  // /api/notices এর GET যেই একই filter দিয়ে server component (page.tsx)
  // থেকে fetch করা — status='published', publish_at<=now, expire হয়নি —
  // এখানে আর কোনো filter query হয় না, শুধু client-side category tab অনুযায়ী
  // ভাগ করা হয় (dataset ছোট বলে আলাদা করে fetch/pagination লাগছে না)
  notices: PublicNotice[];
}

type CategoryFilter = NoticeCategory | "all";

// FINAL PLAN: pagination/search স্কোপে নেই — শুধু category tab filter,
// pinned আলাদা সেকশন, বাকিটা latest সেকশন
export default function NoticeBoard({ notices }: NoticeBoardProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  if (notices.length === 0) {
    return (
      <div className="rounded-card border border-border bg-white p-8 text-center text-ink-soft">
        এখনো কোনো নোটিশ প্রকাশ করা হয়নি। শীঘ্রই এখানে নতুন নোটিশ দেখা যাবে।
      </div>
    );
  }

  const filtered =
    activeCategory === "all" ? notices : notices.filter((n) => n.category === activeCategory);
  const pinned = filtered.filter((n) => n.is_pinned);
  const latest = filtered.filter((n) => !n.is_pinned);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="নোটিশ ক্যাটাগরি">
        <CategoryTab
          label="সব"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
        {NOTICE_CATEGORY_OPTIONS.map((opt) => (
          <CategoryTab
            key={opt.value}
            label={opt.label}
            active={activeCategory === opt.value}
            onClick={() => setActiveCategory(opt.value)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-card border border-border bg-white p-8 text-center text-ink-soft">
          এই ক্যাটাগরিতে এখন কোনো নোটিশ নেই।
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {pinned.length > 0 && (
            <section aria-labelledby="pinned-notices-heading">
              <h2 id="pinned-notices-heading" className="font-display text-lg font-semibold text-ink">
                📌 পিন করা নোটিশ
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="latest-notices-heading">
            {pinned.length > 0 && (
              <h2 id="latest-notices-heading" className="font-display text-lg font-semibold text-ink">
                সাম্প্রতিক নোটিশ
              </h2>
            )}
            {latest.length === 0 ? (
              <p className="mt-4 text-sm text-ink-soft">আর কোনো নোটিশ নেই।</p>
            ) : (
              <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", pinned.length > 0 && "mt-4")}>
                {latest.map((notice) => (
                  <NoticeCard key={notice.id} notice={notice} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-border text-ink-soft hover:bg-black/[0.03] hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
