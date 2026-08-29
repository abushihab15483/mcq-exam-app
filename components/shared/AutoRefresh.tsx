"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intervalMs?: number;
}

// /exam (পরীক্ষাসমূহ) আর /live পেজ দুটোই Server Component — request আসার
// মুহূর্তে Supabase থেকে exam এর start_time/end_time দেখে "চলমান/আসন্ন/সমাপ্ত"
// ঠিক করে (force-dynamic, তাই প্রতিটা নতুন request এই fresh data-ই পায়)।
// কিন্তু কেউ পেজ খুলে বসে থাকলে exam এর সময় পার হয়ে গেলেও সেই খোলা ট্যাবে
// কিছুই বদলাত না — router.refresh() ছাড়া client নিজে থেকে আবার data চাইতোই না।
// এই component শুধু periodically router.refresh() কল করে — এটা শুধু বর্তমান
// route এর Server Component অংশটুকু re-render করায় (URL/scroll/অন্যান্য client
// state অক্ষত থাকে, পুরো পেজ reload হয় না)। এটা কোনো নতুন data-fetching বা
// security check যোগ করে না — exam window/token/deadline validation যা আগে
// থেকেই আছে (getExamWindowStatus, computeAttemptDeadline ইত্যাদি), সেসব
// অপরিবর্তিত থাকে; এই component শুধু existing server logic-টাকে আবার আগের
// মতোই চালায়, নতুন কিছু bypass বা override করে না।
export default function AutoRefresh({ intervalMs = 30_000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id) return;
      id = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };

    // ট্যাব background এ থাকলে refresh বন্ধ রাখা হয় — অহেতুক Supabase read আর
    // ব্যাটারি/নেটওয়ার্ক খরচ কমাতে। ট্যাব আবার active হলে সাথে সাথে একবার
    // refresh করা হয় (stale data বেশিক্ষণ চোখে না পড়ে), তারপর interval আবার শুরু।
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return null;
}
