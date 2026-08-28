import type { Metadata } from "next";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import ExamCard from "@/components/coaching/ExamCard";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import { DEMO_RUNNING_EXAM, DEMO_UPCOMING_EXAM } from "@/lib/demo-exams";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "পরীক্ষাসমূহ",
  description: "অংকুর জামালপুর শাখার আসন্ন, চলমান ও সমাপ্ত অনলাইন এমসিকিউ পরীক্ষার সময়সূচি দেখো।",
  alternates: { canonical: "/exam" },
};

export default async function ExamListPage() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, start_time, end_time, duration_minutes")
    .eq("status", "published")
    .order("start_time", { ascending: true });

  const list = exams ?? [];
  const upcoming = list.filter((e) => e.start_time > now);
  const running = list.filter((e) => e.start_time <= now && e.end_time >= now);
  const finished = list.filter((e) => e.end_time < now).reverse();

  // বাস্তব ডেটা না থাকলেই কেবল ডামি কার্ড দেখানো হবে — "সমাপ্ত পরীক্ষা" তে এটা
  // ইচ্ছাকৃতভাবে বাদ: dummy finished exam card দেখিয়ে "ফলাফল দেখো" লিংক দিলে
  // student ক্লিক করে কোনো আসল ফলাফল পেত না (demo-finished বলে কোনো attempt/exam
  // DB তে নেই)। তাই আসল কোনো পরীক্ষা সত্যিই শেষ না হওয়া পর্যন্ত এই সেকশনে
  // কোনো কার্ডই দেখানো হবে না — নিচে খালি অবস্থার আলাদা মেসেজ আছে।
  if (running.length === 0) running.push(DEMO_RUNNING_EXAM);
  if (upcoming.length === 0) upcoming.push(DEMO_UPCOMING_EXAM);

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold">পরীক্ষাসমূহ</span>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-snug text-ink">পরীক্ষার সময়সূচি</h1>
        <p className="mt-3 max-w-xl leading-[1.8] text-ink-soft">চলমান, আসন্ন ও সমাপ্ত — সব পরীক্ষা এক জায়গায়। যেটা এখন চলছে সেটায় সরাসরি যোগ দাও, বাকিগুলোর জন্য প্রস্তুতি নাও।</p>

        <section className="mt-12" aria-labelledby="running-heading">
          <h2 id="running-heading" className="font-display text-xl font-semibold text-ink">চলমান পরীক্ষা</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {running.map((e, i) => (
              <ExamCard
                key={e.id}
                index={i}
                status="running"
                title={e.title}
                meta={`সময়কাল: ${e.duration_minutes} মিনিট · শেষ হবে ${formatDateTime(e.end_time)}`}
                href="/live"
                linkLabel="এখনই দাও"
              />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="font-display text-xl font-semibold text-ink">আসন্ন পরীক্ষা</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e, i) => (
              <ExamCard
                key={e.id}
                index={i + 1}
                status="upcoming"
                title={e.title}
                meta={`শুরু হবে ${formatDateTime(e.start_time)} · সময়কাল: ${e.duration_minutes} মিনিট`}
                href="/exam"
                linkLabel="বিস্তারিত"
              />
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="finished-heading">
          <h2 id="finished-heading" className="font-display text-xl font-semibold text-ink">সমাপ্ত পরীক্ষা</h2>
          {finished.length === 0 ? (
            <p className="mt-5 text-ink-soft">এখনো কোনো পরীক্ষা শেষ হয়নি। কোনো পরীক্ষা শেষ হলে সেটার ফলাফল এখানে দেখা যাবে।</p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {finished.map((e, i) => (
                <ExamCard
                  key={e.id}
                  index={i + 2}
                  status="finished"
                  title={e.title}
                  meta={`শেষ হয়েছে ${formatDateTime(e.end_time)}`}
                  href={`/result/${e.id}`}
                  linkLabel="ফলাফল দেখো"
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
