import type { Metadata } from "next";

// অ্যাডমিন প্যানেলের কোনো পেজ (login, dashboard, exam/question ম্যানেজমেন্ট,
// results) Google-এ ইনডেক্স হওয়ার দরকার নেই — এগুলোর কোনো SEO ভ্যালু নেই এবং
// ইনডেক্স হলে সার্চ রেজাল্টে admin login পেজ দেখা যেতে পারে, যেটা ভালো দেখায় না।
// এই layout এর metadata সব admin পেজে (children) প্রযোজ্য হবে, যেহেতু কোনো
// individual admin page.tsx নিজের metadata সেট করে না।
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
