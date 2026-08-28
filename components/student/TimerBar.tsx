"use client";

import { useEffect, useState, useRef } from "react";
import { cn, formatSeconds } from "@/lib/utils";

interface TimerBarProps {
  deadline: number; // epoch ms — কখন exam শেষ হবে
  totalSeconds: number; // progress bar % এর জন্য (attempt এর মোট duration সেকেন্ডে)
  onExpire?: () => void;
}

// পরীক্ষার countdown timer — deadline (epoch ms) ধরে হিসাব করে, তাই page reload/tab
// বন্ধ করে আবার খুললেও সঠিক বাকি সময় দেখায় (Step 6: resume-safe)।
// ৫ মিনিটের কমে amber (warn), ১ মিনিটের কমে লাল (danger)।
export default function TimerBar({ deadline, totalSeconds, onExpire }: TimerBarProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((deadline - Date.now()) / 1000)));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    function tick() {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const isDanger = remaining <= 60;
  const isWarn = remaining <= 300 && !isDanger;
  const percentLeft = totalSeconds > 0 ? Math.max(0, Math.round((remaining / totalSeconds) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-ink-soft font-body">সময় বাকি</span>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            isDanger ? "text-danger" : isWarn ? "text-gold" : "text-ink"
          )}
          role="timer"
          aria-live={isDanger ? "assertive" : "off"}
        >
          {formatSeconds(remaining)}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-black/[0.06]" role="progressbar" aria-valuenow={percentLeft} aria-valuemin={0} aria-valuemax={100} aria-label="বাকি সময়ের শতাংশ">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000",
            isDanger ? "bg-danger" : isWarn ? "bg-gold" : "bg-ink"
          )}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
      {isDanger && (
        <p className="mt-1 text-sm text-danger font-medium">সময় প্রায় শেষ — উত্তর জমা দেওয়ার প্রস্তুতি নাও</p>
      )}
    </div>
  );
}
