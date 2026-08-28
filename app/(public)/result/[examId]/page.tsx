"use client";

import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import ResultLookup from "@/components/student/ResultLookup";

// Submit করার পরপরই এই পেজে redirect হয় (exam page থেকে)। localStorage এ attempt
// থাকলে সাথে সাথে দেখাবে, না থাকলে (অন্য ডিভাইস/ব্রাউজার) ফোন নাম্বার দিয়ে খোঁজার
// ফর্ম দেখাবে — আসল লজিক components/student/ResultLookup.tsx এ।
export default function ResultPage({ params }: { params: { examId: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <ResultLookup examId={params.examId} />
      </main>
      <Footer />
    </div>
  );
}
