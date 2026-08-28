"use client";

import { useEffect } from "react";

// পেজের যেকোনো জায়গায় ".reveal-up" ক্লাস বসিয়ে দিলেই স্ক্রল করে কাছে এলে
// এই কম্পোনেন্ট সেটাতে ".is-visible" যোগ করে fade+slide-up অ্যানিমেশন চালু করবে।
export default function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal-up:not(.is-visible)");

    if (els.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
