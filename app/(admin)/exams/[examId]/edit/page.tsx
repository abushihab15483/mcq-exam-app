"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExamForm from "@/components/admin/ExamForm";
import Card from "@/components/ui/Card";
import type { Exam } from "@/types";

export default function EditExamPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questionCount, setQuestionCount] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/exams/${params.examId}`)
      .then((r) => r.json())
      .then((data) => setExam(data.exam ?? null));
    fetch(`/api/questions?exam_id=${params.examId}`)
      .then((r) => r.json())
      .then((data) => setQuestionCount((data.questions ?? []).length));
  }, [params.examId]);

  async function handleSubmit(values: unknown) {
    setError(null);
    const res = await fetch(`/api/exams/${params.examId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "আপডেট করা যায়নি");
      return;
    }
    router.push("/exams");
    router.refresh();
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">পরীক্ষা এডিট করো</h1>
      <Card className="max-w-lg">
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}
        {exam ? (
          <ExamForm
            initialValue={exam}
            onSubmit={handleSubmit}
            submitLabel="পরিবর্তন সংরক্ষণ করো"
            allowPublish={true}
            questionCount={questionCount}
          />
        ) : (
          <p className="text-ink-soft">লোড হচ্ছে...</p>
        )}
      </Card>
    </>
  );
}
