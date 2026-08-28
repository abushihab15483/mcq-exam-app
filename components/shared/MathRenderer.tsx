"use client";

import { MathJax } from "better-react-mathjax";
import { useMathStatus } from "@/components/shared/MathProvider";
import MathErrorBoundary from "@/components/shared/MathErrorBoundary";
import { hasMathContent, plainMathFallback } from "@/lib/math";

interface MathRendererProps {
  text: string;
  className?: string;
}

// প্রশ্নের টেক্সটে $...$ এর ভিতরে LaTeX ফর্মুলা থাকলে এইটা সেটা render করবে।
// সাধারণ টেক্সট থাকলেও সমস্যা নাই, MathJax নিজে থেকে চিনে নেয়।
//
// Issue #10 fix — এই একটা component-ই question, option দুই জায়গাতেই math
// render করার জন্য ব্যবহৃত হয় (QuestionCard.tsx), তাই fallback logic এক জায়গায়
// রাখলেই সব জায়গায় প্রযোজ্য হয়ে যায়:
//
//   1. text-এ আসলে math ($...$) না থাকলে MathJax-ই স্পর্শ করা হয় না — plain
//      render, দ্রুত এবং সবসময় নিরাপদ।
//   2. MathJax load fail করলে (CDN/local asset/timeout — MathProvider থেকে
//      status আসে) সরাসরি readable plain-text fallback দেখানো হয়, MathJax
//      component-কে আর ডাকা হয় না।
//   3. MathJax load ঠিক থাকলেও, কোনো render-time error হলে MathErrorBoundary
//      সেটা ধরে ফেলে যাতে একটা প্রশ্নের সমস্যা পুরো exam page ভাঙতে না পারে।
//
// সবক্ষেত্রেই raw string React children হিসেবে বসে (dangerouslySetInnerHTML
// না), তাই সবসময় XSS-safe।
export default function MathRenderer({ text, className }: MathRendererProps) {
  const status = useMathStatus();

  if (!hasMathContent(text)) {
    return (
      <div className={className} lang="bn">
        {text}
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className={className} lang="bn">
        {plainMathFallback(text)}
      </div>
    );
  }

  return (
    <MathErrorBoundary
      fallback={
        <div className={className} lang="bn">
          {plainMathFallback(text)}
        </div>
      }
    >
      <div className={className} lang="bn">
        <MathJax dynamic>{text}</MathJax>
      </div>
    </MathErrorBoundary>
  );
}
