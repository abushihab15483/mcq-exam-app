import type { Metadata } from "next";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import NoticeBoard from "@/components/coaching/NoticeBoard";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicNotice } from "@/types";

// প্রতিটা request এ fresh data — নাহলে নতুন প্রকাশিত/edited notice সাথে সাথে
// দেখাতো না (exam list page এর একই pattern)
export const dynamic = "force-dynamic";

// FINAL PLAN Step 8 — বাকি পাবলিক পেজের (about/exam/contact) একই pattern:
// title/description/canonical, openGraph override না করে root layout (app/layout.tsx)
// এর ডিফল্ট openGraph ইনহেরিট করতে দেওয়া হলো (siteConfig.titleDefault + opengraph-image.jpg)
export const metadata: Metadata = {
  title: "নোটিশ বোর্ড",
  description:
    "অংকুর জামালপুর শাখার সব নোটিশ এক জায়গায় — পরীক্ষার ফলাফল, ছুটি, ক্লাস রুটিন, ভর্তি বিজ্ঞপ্তি ও জরুরি ঘোষণা।",
  alternates: { canonical: "/notice" },
};

const PUBLIC_NOTICE_COLUMNS =
  "id, title, content, category, attachment_url, is_pinned, publish_at, expires_at";

export default async function NoticePage() {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // /api/notices এর GET route এর হুবহু একই filter/order — সেই route এখান
  // থেকে কল না করে (নিজের API নিজে fetch করা এড়াতে, exam/page.tsx এর মতোই
  // সরাসরি Supabase query) কিন্তু নিয়মটা এক জায়গায় (এখানে) ভুল হলে অন্য
  // জায়গায়ও (ticker, Step 6) একই query copy হবে
  const { data: notices } = await supabase
    .from("notices")
    .select(PUBLIC_NOTICE_COLUMNS)
    .eq("status", "published")
    .lte("publish_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .returns<PublicNotice[]>();

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold">নোটিশ বোর্ড</span>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-snug text-ink">সব নোটিশ</h1>
        <p className="mt-3 max-w-xl leading-[1.8] text-ink-soft">
          ফলাফল, ছুটি, রুটিন, ভর্তি ও অন্যান্য গুরুত্বপূর্ণ ঘোষণা — সব এক জায়গায়।
        </p>

        <div className="mt-10">
          <NoticeBoard notices={notices ?? []} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
