import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F7F5",
        ink: {
          DEFAULT: "#1C2333",
          soft: "#4A5268",
          // আগে #8A90A2 ছিল — #F7F7F5 ব্যাকগ্রাউন্ডে contrast ratio মাত্র ~2.97:1 (WCAG AA
          // এর 4.5:1 এর নিচে)। একই hue পরিবারে গাঢ় করে (~4.5:1) readability ঠিক করা হলো,
          // রঙ identity/palette অপরিবর্তিত রেখে
          faint: "#6B7280",
        },
        gold: {
          DEFAULT: "#A9762F",
          light: "#D9B978",
        },
        success: "#2F6B4F",
        danger: "#B3402E",
        border: "#E2E4E9",
      },
      fontFamily: {
        // Fraunces সরানো হয়েছে (font family কমাতে) — display এখন Inter (body ভ্যারিয়েবল
        // পুনঃব্যবহার, দ্বিতীয়বার লোড এড়াতে) ব্যবহার করে, বাংলার জন্য একটা মাত্র Anek Bangla
        // instance (--font-bn) fallback হিসেবে সব জায়গায় — display/body আলাদা instance নেই
        display: ["var(--font-body)", "var(--font-bn)", "sans-serif"],
        body: ["var(--font-body)", "var(--font-bn)", "sans-serif"],
        // Hind Siliguri সরানো হয়েছে — বাংলা সংখ্যার ফলব্যাক এখন Anek Bangla (--font-bn)
        mono: ["var(--font-mono)", "var(--font-bn)", "monospace"],
      },
      borderRadius: {
        card: "0.625rem",
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle, rgba(169,118,47,0.28) 1px, transparent 1px)",
        "line-grid":
          "linear-gradient(to right, rgba(28,35,51,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,35,51,0.055) 1px, transparent 1px)",
      },
      backgroundSize: {
        dots: "18px 18px",
        grid: "44px 44px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(28,35,51,0.04), 0 8px 24px -8px rgba(28,35,51,0.10)",
        lift: "0 4px 6px rgba(28,35,51,0.04), 0 16px 32px -12px rgba(28,35,51,0.16)",
      },
    },
  },
  plugins: [],
};
export default config;
