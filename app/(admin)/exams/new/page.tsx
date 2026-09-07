"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ExamForm from "@/components/admin/ExamForm";
import Card from "@/components/ui/Card";

export default function NewExamPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // useRef — কারণ setState ব্যাচড/asynchronous, দ্রুত ২-৩ বার ট্যাপ করলে React
  // re-render হওয়ার আগেই দ্বিতীয়/তৃতীয় ক্লিক ইভেন্ট চলে আসতে পারে (বিশেষ করে
  // মোবাইলে বা ধীর নেটওয়ার্কে বার বার ট্যাপ করলে)। ref সবসময় সিঙ্ক্রোনাসভাবে
  // পড়া/লেখা যায়, তাই এটাই আসল guard — নিচে disabled prop (Button UI) হলো
  // দ্বিতীয় স্তরের সুরক্ষা (ব্যবহারকারীকে visually বোঝানো যে সেভ হচ্ছে)।
  const savingRef = useRef(false);

  async function handleSubmit(values: unknown) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      savingRef.current = false;
      setSaving(false);
      setError(data.error ?? "তৈরি করা যায়নি");
      return;
    }
    router.push("/exams");
    router.refresh();
    // savingRef ইচ্ছাকৃতভাবে reset করা হচ্ছে না — এই component এখনই unmount
    // হয়ে যাচ্ছে (router.push), reset করলে navigation শেষ হওয়ার আগের কোনো
    // মুহূর্তে বাটন আবার সক্রিয় হয়ে দ্বিতীয় submit-এর সুযোগ তৈরি হতে পারত
  }

  return (
    <AdminShell>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">নতুন পরীক্ষা তৈরি করো</h1>
      <Card className="max-w-lg">
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}
        <ExamForm
          onSubmit={handleSubmit}
          submitLabel={saving ? "তৈরি হচ্ছে..." : "পরীক্ষা তৈরি করো"}
          allowPublish={false}
          disabled={saving}
        />
      </Card>
    </AdminShell>
  );
}
