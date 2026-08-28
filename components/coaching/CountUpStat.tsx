"use client";

// হোমপেজের STATS সেকশনের সংখ্যাগুলো (৫,০০০+ শিক্ষার্থী ইত্যাদি) আগে সরাসরি
// পুরো সংখ্যা দেখাতো — এখন স্ক্রল করে কাছে এলে ০ থেকে শুরু করে আসল সংখ্যা
// পর্যন্ত ধীরে ধীরে বেড়ে ওঠে (অন্যান্য সাইটে যেমন দেখা যায় সেরকম "count-up" effect)।
import { useEffect, useRef, useState } from "react";

interface CountUpStatProps {
  target: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

export default function CountUpStat({ target, suffix = "", durationMs = 1600, className }: CountUpStatProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animate = () => {
      if (started.current) return;
      started.current = true;

      // reduced-motion চাইলে সরাসরি আসল সংখ্যা দেখানো হবে, কোনো animation ছাড়া
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setValue(target);
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / durationMs, 1);
        // ease-out — শুরুতে দ্রুত, শেষে ধীর হয়ে আসল সংখ্যায় থামবে
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      animate();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, durationMs]);

  return (
    <span ref={ref} className={className}>
      {value.toLocaleString("bn-BD")}
      {suffix}
    </span>
  );
}
