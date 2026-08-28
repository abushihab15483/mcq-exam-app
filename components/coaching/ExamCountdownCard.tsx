"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const bn = (n: number) => n.toLocaleString("bn-BD", { minimumIntegerDigits: 2 });

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isLive: diff <= 0,
  };
}

interface Props {
  title: string;
  classChip: string;
  meta: string;
  examDateTime: string; // ISO string
  href: string;
}

export default function ExamCountdownCard({ title, classChip, meta, examDateTime, href }: Props) {
  const target = new Date(examDateTime);
  // Fix #12 — আগে useState(() => getRemaining(target)) দিয়ে initial render এই
  // Date.now() ব্যবহার করে সময়-নির্ভর মান বসানো হতো। server render আর client এর
  // প্রথম (hydration) render আলাদা মুহূর্তে ঘটে, তাই ওই দুই মুহূর্তের Date.now()
  // ভিন্ন হয়ে সংখ্যাগুলো মিলত না — React hydration mismatch।
  // এখন remaining শুরুতে null (server আর client এর প্রথম render একদম identical,
  // কোনো সময়-নির্ভর হিসাব নাই) — আসল প্রথম হিসাব হয় নিচের useEffect এ, mount
  // হওয়ার পরে (শুধু client এ চলে, তাই hydration compare করার প্রশ্নই আসে না)।
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const update = () => setRemaining(getRemaining(target));
    update(); // প্রথম মান সাথে সাথেই বসানো, ১ সেকেন্ড অপেক্ষা না করিয়ে
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examDateTime]);

  // remaining এখনো null (প্রথম client calculation হওয়ার আগ পর্যন্ত, খুবই সংক্ষিপ্ত
  // মুহূর্ত) — তখন badge "পরবর্তী পরীক্ষা" (neutral/non-live) দেখাবে, ভুল করে
  // "এখন চলছে" দেখাবে না। server এর নিজের exam-window check এমনিতেই অপরিবর্তিত
  // আছে (student আসল exam পেজে গেলে সেটাই চূড়ান্ত সিদ্ধান্ত নেয়) — এই কার্ড শুধু
  // homepage এ preview countdown, কোনো access-control সিদ্ধান্ত এখানে হয় না।
  const isLive = remaining?.isLive ?? false;
  const units = [
    { label: "দিন", value: remaining ? bn(remaining.days) : "—" },
    { label: "ঘণ্টা", value: remaining ? bn(remaining.hours) : "—" },
    { label: "মিনিট", value: remaining ? bn(remaining.minutes) : "—" },
    { label: "সেকেন্ড", value: remaining ? bn(remaining.seconds) : "—" },
  ];

  return (
    <div className="rounded-card border border-border bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold " +
                (isLive ? "bg-danger/10 text-danger" : "bg-gold/10 text-gold")
              }
            >
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " + (isLive ? "bg-danger animate-pulse" : "bg-gold")
                }
              />
              {isLive ? "পরীক্ষা এখন চলছে" : "পরবর্তী পরীক্ষা"}
            </span>
            <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink-soft">
              {classChip}
            </span>
          </div>

          <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm text-ink-faint">{meta}</p>

          <Link
            href={href}
            className="mt-6 inline-flex items-center gap-2 rounded-card bg-gold px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-gold/90"
          >
            বিস্তারিত দেখো
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-faint">
            পরীক্ষা শুরু হতে বাকি
          </p>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="পরীক্ষা শুরু হতে বাকি সময় গণনা চলছে">
            {units.map((unit) => (
              <div key={unit.label} className="rounded-card bg-paper text-center ring-1 ring-border py-3">
                <span className="block font-mono text-lg font-semibold text-ink">{unit.value}</span>
                <span className="block text-[11px] text-ink-faint">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
