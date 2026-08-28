"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ExamForm from "@/components/admin/ExamForm";
import Card from "@/components/ui/Card";

export default function NewExamPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: unknown) {
    setError(null);
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "তৈরি করা যায়নি");
      return;
    }
    router.push("/exams");
    router.refresh();
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
        <ExamForm onSubmit={handleSubmit} submitLabel="পরীক্ষা তৈরি করো" allowPublish={false} />
      </Card>
    </AdminShell>
  );
}
