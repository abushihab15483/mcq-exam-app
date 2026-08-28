"use client";

import { MathJaxContext } from "better-react-mathjax";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// এই component শুধু exam পেজেই (app/(public)/exam/[examId]/page.tsx) wrap করা হয় —
// পুরো app কে না, কারণ MathJax শুধু প্রশ্ন/অপশনের LaTeX ($x^2+1$ এর মতো) render
// করতে লাগে, আর সেটা শুধু exam স্ক্রিনেই দরকার। এভাবে বাকি (Home/About/Live/Result
// ইত্যাদি) পেজে MathJax script একদম লোড হয় না।
//
// Issue #10 fix: MathJax আগে external CDN (cdnjs.cloudflare.com) থেকে লোড হতো,
// যেটা exam-এর জন্য একটা single point of failure ছিল — school network/CDN/DNS
// block হলে math রেন্ডার ভেঙে যেত। এখন MathJax এই repo থেকেই
// (public/vendor/mathjax — build time-এ scripts/setup-mathjax-assets.js দিয়ে
// generate হয় node_modules-এর pinned mathjax-full থেকে) same-origin serve হয়,
// তাই কোনো runtime external network dependency নেই।
//
// এছাড়া এই provider load status (loading/ready/failed) track করে এবং
// descendant-দের জন্য context এ expose করে, যাতে MathRenderer জানতে পারে কখন
// MathJax আসলে ব্যবহারযোগ্য না এবং plain-text fallback দেখাতে হবে।

export type MathStatus = "loading" | "ready" | "failed";

const MathStatusContext = createContext<MathStatus>("loading");

// অন্য কোনো component থেকে (এখন MathRenderer) call করা হয় এই status জানতে।
export function useMathStatus(): MathStatus {
  return useContext(MathStatusContext);
}

// Self-hosted, same-origin path — কোনো external CDN নেই। এই asset গুলো
// `npm install` / `npm run dev` / `npm run build` এর সময় automatically তৈরি হয়
// (দেখো scripts/setup-mathjax-assets.js এবং package.json এর postinstall script)।
const LOCAL_MATHJAX_SRC = "/vendor/mathjax/tex-mml-chtml.js";

// Local script কখনো "error" event না ছুঁড়েও আটকে যেতে পারে (যেমন কোনো proxy
// silently request drop করলে)। এই timeout সেই ক্ষেত্রে infinite "loading"
// state আটকায় — একটা সময় পরে না এলে ধরে নেওয়া হয় load fail হয়েছে, আর
// fallback দেখানো শুরু হয়।
const MATHJAX_LOAD_TIMEOUT_MS = 8000;

export default function MathProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MathStatus>("loading");
  const settledRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        setStatus("failed");
      }
    }, MATHJAX_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleLoad = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStatus("ready");
  };

  const handleError = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setStatus("failed");
  };

  return (
    <MathStatusContext.Provider value={status}>
      <MathJaxContext
        src={LOCAL_MATHJAX_SRC}
        onLoad={handleLoad}
        onError={handleError}
        config={{
          loader: { load: ["input/asciimath"] },
          tex: { inlineMath: [["$", "$"]] },
        }}
      >
        {children}
      </MathJaxContext>
    </MathStatusContext.Provider>
  );
}
