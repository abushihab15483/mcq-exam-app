"use client";

import { useState } from "react";
import { useStorageStatus } from "@/lib/useStorageStatus";

// Non-blocking warning shown when localStorage is unavailable (private
// browsing, kiosk browser, disabled storage, full/blocked storage, etc).
// Renders nothing while status is "available"/"unknown", never blocks the
// exam, and stays dismissed (per mount) once closed so it doesn't reappear
// on every re-render.
export default function StorageWarning() {
  const status = useStorageStatus();
  const [dismissed, setDismissed] = useState(false);

  if (status !== "unavailable" || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4 flex items-start justify-between gap-3 rounded-card border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-ink-soft"
    >
      <p>
        এই ডিভাইস/ব্রাউজার লোকাল স্টোরেজ ব্লক করছে। এই পেজ খোলা থাকা অবস্থায় তোমার উত্তর সংরক্ষিত
        থাকবে, কিন্তু পেজ রিফ্রেশ করলে হারিয়ে যেতে পারে।
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
