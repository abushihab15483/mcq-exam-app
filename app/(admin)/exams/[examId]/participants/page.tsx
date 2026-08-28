"use client";

import { useEffect, useState } from "react";
import StudentTable from "@/components/admin/StudentTable";
import type { Attempt } from "@/types";

export default function ParticipantsPage({ params }: { params: { examId: string } }) {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);

  useEffect(() => {
    fetch(`/api/attempts?exam_id=${params.examId}`)
      .then((r) => r.json())
      .then((data) => setAttempts(data.attempts ?? []));
  }, [params.examId]);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">অংশগ্রহণকারী শিক্ষার্থী</h1>
      {attempts ? <StudentTable attempts={attempts} /> : <p className="text-ink-soft">লোড হচ্ছে...</p>}
    </>
  );
}
