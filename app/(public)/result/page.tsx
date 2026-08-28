// এইটাই student দের জন্য fix "ফলাফল দেখো" লিংক — /result
// সবচেয়ে সম্প্রতি শেষ হওয়া (published + end_time পার হয়ে গেছে) exam টা ধরে নেওয়া
// হয় — কারণ সাধারণত student সবচেয়ে সাম্প্রতিক পরীক্ষার ফলাফলই খুঁজবে।
import type { Metadata } from "next";
import ResultLookup from "@/components/student/ResultLookup";
import Card from "@/components/ui/Card";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ফলাফল",
  description: "তোমার ফোন নাম্বার দিয়ে অংকুর জামালপুর শাখার পরীক্ষার ফলাফল খুঁজে দেখো।",
  alternates: { canonical: "/result" },
};

export default async function ResultEntryPage() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title")
    .eq("status", "published")
    .lte("end_time", now)
    .order("end_time", { ascending: false })
    .limit(1);

  const exam = exams?.[0];

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink">তোমার ফলাফল দেখো</h1>
        {!exam ? (
          <Card className="py-10 text-center">
            <p className="text-ink-soft">এখনো কোনো পরীক্ষার ফলাফল প্রকাশিত হয়নি।</p>
          </Card>
        ) : (
          <ResultLookup examId={exam.id} examTitle={exam.title} autoLoadFromStorage={false} />
        )}
      </main>
      <Footer />
    </div>
  );
}
