"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import { toLocalDateTimeInputValue } from "@/lib/utils";
import { examSchema } from "@/lib/validators";
import type { Exam, ExamStatus } from "@/types";

interface ExamFormProps {
  initialValue?: Partial<Exam>;
  onSubmit: (values: {
    title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: ExamStatus;
  }) => void;
  submitLabel?: string;
  allowPublish?: boolean;
  questionCount?: number;
}

// datetime-local ইনপুট এর ভ্যালু (যেমন "2026-08-24T10:00") থেকে UTC ISO string —
// খালি বা আজব ভ্যালুতে Date.toISOString() throw করে, তাই সরাসরি কল না করে এখানে
// guard করা হচ্ছে (submit করার আগেই examSchema তে "শুরুর সময় দাও" হিসেবে ধরা পড়বে,
// এখানে crash করবে না)
function toISOOrEmpty(localValue: string): string {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// exam বানানো/এডিট করার ফর্ম — Step 6 এ onSubmit এর ভিতর আসল API কল বসবে
export default function ExamForm({
  initialValue,
  onSubmit,
  submitLabel = "সংরক্ষণ করো",
  allowPublish = true,
  questionCount,
}: ExamFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [startTime, setStartTime] = useState(toLocalDateTimeInputValue(initialValue?.start_time));
  const [endTime, setEndTime] = useState(toLocalDateTimeInputValue(initialValue?.end_time));
  const [duration, setDuration] = useState(initialValue?.duration_minutes ?? 30);
  const [status, setStatus] = useState<ExamStatus>(initialValue?.status ?? "draft");
  // Fix #11 — start/end/duration এর মধ্যে সম্পর্ক ভুল হলে server এ পাঠানোর আগেই
  // এখানে আটকানো হয়, একই examSchema (lib/validators.ts) দিয়ে — যেই একই নিয়ম
  // server ও শেষমেশ enforce করে, তাই এই দুটো কখনো out-of-sync হবে না।
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const values = {
      title,
      // datetime-local ভ্যালু browser এর local timezone এ ধরে UTC ISO তে বদলানো হচ্ছে
      start_time: toISOOrEmpty(startTime),
      end_time: toISOOrEmpty(endTime),
      duration_minutes: duration,
      status,
    };

    const parsed = examSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "তথ্য সঠিক না, আবার চেক করো");
      return;
    }

    setFormError(null);
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="পরীক্ষার তথ্য ফর্ম">
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Input label="পরীক্ষার নাম" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="শুরুর সময়"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
        <Input
          label="শেষ সময়"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />
      </div>
      <Input
        label="সময়কাল (মিনিট)"
        type="number"
        min={1}
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="exam-status" className="text-sm font-medium text-ink-soft">
          অবস্থা
        </label>
        <select
          id="exam-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ExamStatus)}
          className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        >
          <option value="draft">খসড়া (draft)</option>
          {allowPublish && <option value="published">প্রকাশিত (published)</option>}
          <option value="closed">বন্ধ (closed)</option>
        </select>
        {status === "published" && questionCount === 0 && (
          <p className="text-sm text-danger">
            ⚠️ এই পরীক্ষায় এখনো কোনো প্রশ্ন নেই — সংরক্ষণ করার সময় প্রকাশ করা আটকে যাবে।
          </p>
        )}
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
