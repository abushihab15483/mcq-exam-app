"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

// Next.js App Router error boundary — এই ফাইলের নিচের যেকোনো সেগমেন্টে (page/layout)
// রেন্ডার/সার্ভার এরর হলে root layout (html/body/font) অক্ষত রেখে এটা রেন্ডার হবে।
// টেকনিক্যাল/সার্ভার/ডেটাবেজ ডিটেইল ছাত্রদের দেখানো হয় না — শুধু সাধারণ বাংলা মেসেজ +
// reset() দিয়ে রিট্রাই।
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ডিবাগিং এর জন্য শুধু console এ — UI তে কোনো টেকনিক্যাল ডিটেইল দেখানো হয় না
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] w-full items-center justify-center px-6 py-10">
      <div
        role="alert"
        className="w-full max-w-md rounded-card border border-danger/30 bg-danger/5 px-6 py-6 text-center"
      >
        <h2 className="font-display text-lg font-semibold text-ink">
          কিছু একটা সমস্যা হয়েছে
        </h2>
        <p className="mt-2 text-sm text-danger">
          পেজটি লোড করা যায়নি। আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।
        </p>
        <Button type="button" onClick={reset} className="mt-4">
          আবার চেষ্টা করুন
        </Button>
      </div>
    </main>
  );
}
