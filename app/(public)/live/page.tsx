// এইটাই student দের জন্য fix link — /live (লাইভ এক্সাম)
// আলাদা আলাদা exam-এর জন্য আলাদা লিংক মনে রাখতে হবে না। এই পেজে গেলেই
// এখন যেই exam চলছে (published + start_time <= এখন <= end_time) সেটা automatic দেখাবে।
import type { Metadata } from "next";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import EntryForm from "@/components/student/EntryForm";
import Card from "@/components/ui/Card";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "লাইভ এক্সাম",
  description: "অংকুর জামালপুর শাখায় এই মুহূর্তে যেই এক্সাম চলছে, সেটাতে সরাসরি অংশ নাও।",
  alternates: { canonical: "/live" },
};

export default async function LiveExamEntryPage() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // একসাথে একাধিক exam active থাকলে যেটা আগে শেষ হবে সেটা দেখানো হচ্ছে
  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, duration_minutes")
    .eq("status", "published")
    .lte("start_time", now)
    .gte("end_time", now)
    .order("end_time", { ascending: true })
    .limit(1);

  const exam = exams?.[0];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        {!exam ? (
          <Card className="py-10 text-center">
            <h1 className="font-display text-xl font-semibold text-ink mb-2">এখন কোনো পরীক্ষা চলছে না</h1>
            <p className="text-ink-soft">পরীক্ষার সময় হলে এই পেজেই দেখতে পারবে। একটু পরে আবার চেক করো।</p>
          </Card>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-semibold text-ink">{exam.title}</h1>
              <p className="mt-1 text-ink-soft">
                মোট সময়: {exam.duration_minutes} মিনিট। শুরু করার আগে নাম ও ফোন নাম্বার দাও।
              </p>
            </div>
            <Card>
              <EntryForm examId={exam.id} />
            </Card>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
