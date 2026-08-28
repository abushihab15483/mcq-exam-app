"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ExamTabsProps {
  examId: string;
}

interface TabDef {
  href: string;
  label: string;
  exact: boolean;
}

export default function ExamTabs({ examId }: ExamTabsProps) {
  const pathname = usePathname();

  const tabs: TabDef[] = [
    { href: `/exams/${examId}`, label: "ওভারভিউ", exact: true },
    { href: `/exams/${examId}/questions`, label: "প্রশ্ন", exact: false },
    { href: `/exams/${examId}/participants`, label: "অংশগ্রহণকারী", exact: false },
    { href: `/exams/${examId}/results`, label: "ফলাফল", exact: false },
    { href: `/exams/${examId}/edit`, label: "এডিট", exact: false },
  ];

  return (
    <nav className="flex gap-6 border-b border-border" aria-label="পরীক্ষা ট্যাব">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 pb-3 pt-1 font-body text-sm font-medium transition-colors",
              isActive
                ? "border-gold text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
