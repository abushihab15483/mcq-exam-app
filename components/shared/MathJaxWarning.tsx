"use client";

import { useState } from "react";
import { useMathStatus } from "@/components/shared/MathProvider";

// Issue #10 fix — StorageWarning-এর মতোই non-blocking banner, MathJax load
// fail করলে (CDN/local asset unreachable, timeout) দেখানো হয়। প্রশ্ন/অপশন
// ততক্ষণে plain text হিসেবে readable থাকে (MathRenderer এর fallback), এই
// banner শুধু student কে জানায় কেন গাণিতিক চিহ্নগুলো সাধারণ টেক্সটে দেখাচ্ছে —
// exam কখনো block করে না, per-question repeat করে না।
export default function MathJaxWarning() {
  const status = useMathStatus();
  const [dismissed, setDismissed] = useState(false);

  if (status !== "failed" || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-card border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-ink-soft"
    >
      <p>
        গাণিতিক চিহ্নসমূহ (ফর্মুলা) এখন সুন্দরভাবে দেখানো যাচ্ছে না, তাই সাধারণ টেক্সট আকারে দেখানো
        হচ্ছে। প্রশ্ন-অপশন সব ঠিকভাবে পড়া ও উত্তর দেওয়া যাবে — উত্তর জমা দিতে কোনো সমস্যা হবে না।
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-ink-faint underline hover:text-ink-soft"
      >
        বন্ধ করো
      </button>
    </div>
  );
}
