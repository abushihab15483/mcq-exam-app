"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { studentEntrySchema } from "@/lib/validators";
import { saveAttempt } from "@/lib/attemptStorage";
import StorageWarning from "@/components/shared/StorageWarning";

interface EntryFormProps {
  examId: string;
}

// Student এর নাম + ফোন নাম্বার নেওয়ার ফর্ম। Submit করলে POST /api/attempts কল হয় —
// exam window/duplicate-phone check server এ হয়। সফল হলে attempt info localStorage এ
// রাখা হয় (exam পেজে timer resume করার জন্য) আর exam স্ক্রিনে নিয়ে যাওয়া হয়।
export default function EntryForm({ examId }: EntryFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; institution?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = studentEntrySchema.safeParse({
      student_name: name,
      student_phone: phone,
      student_institution: institution,
    });

    if (!result.success) {
      const fieldErrors: { name?: string; phone?: string; institution?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "student_name") fieldErrors.name = issue.message;
        if (issue.path[0] === "student_phone") fieldErrors.phone = issue.message;
        if (issue.path[0] === "student_institution") fieldErrors.institution = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          student_name: name,
          student_phone: phone,
          student_institution: institution,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error ?? "শুরু করা যায়নি, আবার চেষ্টা করো");
        setSubmitting(false);
        return;
      }

      // Fails safely (falls back to in-memory) if storage is blocked/full —
      // never throws, so the student can still proceed to the exam. Written
      // into this attempt's own slot in the shared-exam collection (keyed by
      // attemptId), never overwriting another student's slot on this browser.
      saveAttempt(examId, {
        attemptId: data.attempt_id,
        startedAt: data.started_at,
        durationMinutes: data.duration_minutes,
        studentName: name,
        accessToken: data.access_token,
      });

      // attemptId travels in the URL so this tab always knows exactly which
      // student it belongs to, even if another student starts/resumes on a
      // different tab of the same browser afterwards.
      router.push(`/exam/${examId}?a=${encodeURIComponent(data.attempt_id)}`);
    } catch {
      setServerError("নেটওয়ার্ক সমস্যা হয়েছে, আবার চেষ্টা করো");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="পরীক্ষায় অংশগ্রহণের ফর্ম">
      <StorageWarning />
      <Input
        label="তোমার নাম"
        placeholder="যেমন: করিম উদ্দিন"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        required
        autoComplete="name"
      />
      <Input
        label="ফোন নাম্বার"
        placeholder="01712345678"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        required
        inputMode="numeric"
        autoComplete="tel"
      />
      <Input
        label="স্কুল/কলেজের নাম"
        placeholder="যেমন: জামালপুর সরকারি উচ্চ বিদ্যালয়"
        value={institution}
        onChange={(e) => setInstitution(e.target.value)}
        error={errors.institution}
        required
        autoComplete="organization"
      />
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "শুরু হচ্ছে..." : "পরীক্ষা শুরু করো"}
      </Button>
    </form>
  );
}
