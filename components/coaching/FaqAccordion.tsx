"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "কীভাবে অনুশীলনে ভর্তি হতে পারি?",
    a: "যোগাযোগ পেজ থেকে ফর্ম পূরণ করে অথবা সরাসরি আমাদের জামালপুর শাখায় এসে ভর্তি সম্পন্ন করতে পারো।",
  },
  {
    q: "প্র্যাকটিস এক্সাম কি বিনামূল্যে দেওয়া যায়?",
    a: "হ্যাঁ, ভর্তিকৃত প্রতিটি শিক্ষার্থী নিয়মিত প্র্যাকটিস এক্সামে সম্পূর্ণ বিনামূল্যে অংশ নিতে পারে।",
  },
  {
    q: "লাইভ এক্সাম কখন অনুষ্ঠিত হয়?",
    a: "প্রতি সপ্তাহে নির্ধারিত দিনে লাইভ এক্সাম অনুষ্ঠিত হয়। হালনাগাদ সময়সূচি লাইভ এক্সাম পেজে পাওয়া যাবে।",
  },
  {
    q: "পরীক্ষার ফলাফল কীভাবে দেখব?",
    a: "পরীক্ষা শেষ হওয়ার পর ফলাফল পেজ থেকে নিজের রোল নম্বর দিয়ে সহজেই ফলাফল দেখা যাবে।",
  },
  {
    q: "কোনো সমস্যা হলে কার সাথে যোগাযোগ করব?",
    a: "যোগাযোগ পেজে দেওয়া ফোন নম্বর বা ইমেইল ঠিকানায় যোগাযোগ করলে আমাদের টিম সাহায্য করবে।",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-card border border-border bg-white">
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink"
              >
                {item.q}
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                  className={cn("shrink-0 transition-transform", isOpen && "rotate-45")}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </h3>
            {isOpen && (
              <div className="px-5 pb-4 text-sm leading-[1.8] text-ink-soft">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
