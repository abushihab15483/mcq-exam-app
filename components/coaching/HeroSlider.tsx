"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SLIDES = [
  { src: "/images/coaching/hero-poster-1.webp", alt: "HSC'28 এডভান্স ব্যাচের ভর্তি চলছে — অংকুর জামালপুর শাখা" },
  { src: "/images/coaching/hero-poster-2.webp", alt: "HSC 2028 একাদশ শ্রেণির একাডেমিক প্রোগ্রামে ভর্তি চলছে" },
  { src: "/images/coaching/hero-poster-3.webp", alt: "HSC 2027 প্রি-টেস্ট প্রস্তুতি প্রোগ্রাম ২০২৬ ভর্তি চলছে" },
  { src: "/images/coaching/hero-poster-4.webp", alt: "SSC'27 মডেল টেস্ট প্রোগ্রামে ভর্তি চলছে" },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    // Tab ব্যাকগ্রাউন্ডে থাকলে interval বন্ধ রাখা হয় — নাহলে ট্যাব inactive থাকা অবস্থায়ও
    // টাইমার চলতে থাকে, আর ফিরে এলে state stale ইনডেক্স নিয়ে একসাথে কয়েক স্লাইড এগিয়ে
    // যায় (jarring jump)। এতে মোবাইলে ব্যাটারি/CPU-ও বাঁচে যখন ইউজার অন্য অ্যাপে থাকে।
    function start() {
      if (id !== null) return;
      id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4000);
    }
    function stop() {
      if (id === null) return;
      clearInterval(id);
      id = null;
    }
    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-card border border-border bg-white shadow-sm">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            // পেজে (app/(public)/page.tsx) হিরো `lg:grid-cols-2` এর এক column —
            // max-w-6xl(1152px) কন্টেইনারে px-5(20px×2) + gap-16(64px) বাদ দিলে
            // ≥1024px এ আসল রেন্ডার-প্রস্থ ~524px (আগে sizes না থাকায় fill
            // ডিফল্ট 100vw ধরে নিতো, ফলে ডেস্কটপেও দরকারের চেয়ে বড় ইমেজ নামতো)।
            // <1024px এ hero full column width (100vw - দুই পাশের 20px padding)।
            sizes="(min-width: 1024px) 524px, calc(100vw - 40px)"
            className="object-cover"
          />
        </div>
      ))}

      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`স্লাইড ${i + 1}`}
            aria-current={i === index}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index ? "w-6 bg-gold" : "w-2 bg-white/70"
            )}
          />
        ))}
      </div>
    </div>
  );
}
