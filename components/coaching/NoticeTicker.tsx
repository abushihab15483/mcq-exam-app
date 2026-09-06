"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NoticeCard from "./NoticeCard";
import { cn } from "@/lib/utils";
import type { PublicNotice } from "@/types";

// FINAL PLAN (Step 6): static ৪-৫ সেকেন্ড rotate (marquee না — কোনো continuous
// horizontal scroll animation না, পুরো একটা notice একবারে fade-swap হয়), urgent
// প্রথমে, কোনো notice না থাকলে বার পুরো hide, ৩০-৬০ সেকেন্ড periodic refresh।
const ROTATE_INTERVAL_MS = 4500;
const REFETCH_INTERVAL_MS = 45_000;
const FADE_OUT_MS = 250;

// urgent ক্যাটাগরি সবার আগে — বাকি ক্রম (pinned আগে, নতুন প্রকাশিত আগে) /api/notices
// থেকেই আসে, এখানে শুধু stable partition (urgent বনাম বাকি সব), প্রতিটা গ্রুপের
// ভেতরের আপেক্ষিক ক্রম অক্ষত থাকে
function sortForTicker(notices: PublicNotice[]): PublicNotice[] {
  const urgent = notices.filter((n) => n.category === "urgent");
  const rest = notices.filter((n) => n.category !== "urgent");
  return [...urgent, ...rest];
}

export default function NoticeTicker() {
  const [notices, setNotices] = useState<PublicNotice[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  // প্রথম fetch শেষ না হওয়া পর্যন্ত কিছুই render হয় না (loading অবস্থায় খালি বার
  // দেখানো এড়াতে) — fetch শেষ হয়ে notices খালি এলে চিরতরে null থেকে যাবে
  const [checked, setChecked] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Data fetch — mount এ একবার, তারপর প্রতি REFETCH_INTERVAL_MS এ আবার (নতুন
  // publish/edit/expire/draft হওয়া notice সাথে সাথে ticker এ প্রতিফলিত হবে)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notices", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as { notices?: PublicNotice[] };
        if (cancelled) return;
        const sorted = sortForTicker(json.notices ?? []);
        setNotices(sorted);
        // আগের activeIndex এখনো valid থাকলে সেটাই রাখা হলো (রোটেশনের মাঝপথে
        // ঝাঁকুনি এড়াতে), নাহলে শুরু থেকে
        setActiveIndex((prev) => (prev < sorted.length ? prev : 0));
      } catch {
        // নেটওয়ার্ক এরর হলে চুপচাপ থাকবে — আগে থেকে ডেটা থাকলে সেটাই দেখাতে থাকবে,
        // না থাকলে বার hidden-ই থাকবে
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    load();
    const refetchId = setInterval(load, REFETCH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(refetchId);
    };
  }, []);

  // Rotation — একাধিক notice থাকলেই শুধু চলবে, একটামাত্র থাকলে স্থির থাকবে
  useEffect(() => {
    if (notices.length <= 1) return;

    let fadeTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const rotateId = setInterval(() => {
      if (reducedMotionRef.current) {
        // reduced-motion চাইলে fade animation বাদ, সরাসরি পরের notice এ বদলে যাবে
        setActiveIndex((prev) => (prev + 1) % notices.length);
        return;
      }
      setVisible(false);
      fadeTimeoutId = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % notices.length);
        setVisible(true);
      }, FADE_OUT_MS);
    }, ROTATE_INTERVAL_MS);

    return () => {
      clearInterval(rotateId);
      if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
    };
  }, [notices.length]);

  // fetch শেষ হওয়ার আগে বা কোনো published notice না থাকলে বার পুরোপুরি hide
  if (!checked || notices.length === 0) return null;

  const active = notices[Math.min(activeIndex, notices.length - 1)];

  return (
    <div className="border-b border-border bg-white">
      <Link
        href="/notice"
        className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-1.5 transition-colors hover:bg-black/[0.02] sm:gap-3 sm:px-5 sm:py-2"
        aria-label={`নোটিশ: ${active.title} — সব নোটিশ দেখতে ক্লিক করো`}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold/10 px-2 py-1 text-[11px] font-semibold text-gold sm:px-2.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* খুব ছোট স্ক্রিনে (মোবাইল) শুধু আইকন — জায়গা বাঁচাতে, sticky header
              মোবাইলে বেশি উচ্চতা নিলে viewport এর অনেকখানি খেয়ে ফেলে */}
          <span className="hidden sm:inline">নোটিশ</span>
        </span>

        <span
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0"
          )}
        >
          <NoticeCard notice={active} variant="compact" />
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-ink-faint"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}
