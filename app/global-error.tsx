"use client";

import { useEffect } from "react";

// app/error.tsx root layout এর নিচের crash ধরে, কিন্তু root layout নিজে
// (app/layout.tsx) crash করলে সেটা ধরতে পারে না — Next.js docs অনুযায়ী সেই
// ক্ষেত্রে আলাদা global-error.tsx লাগে, আর এটা html/body নিজেই রেন্ডার করে
// (root layout এর জায়গা নিয়ে নেয়, তাই এখানে <html>/<body> লাগবে)।
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="bn">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#F7F7F5",
            color: "#1C2333",
            textAlign: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 600 }}>কিছু একটা সমস্যা হয়েছে</h2>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#8A93A6" }}>
              সাইট লোড করা যায়নি। একটু পর আবার চেষ্টা করুন।
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: "16px",
                padding: "8px 20px",
                borderRadius: "8px",
                background: "#A9762F",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              আবার চেষ্টা করুন
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
