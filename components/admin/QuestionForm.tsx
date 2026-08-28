"use client";

import { useState } from "react";
import { Input, Button } from "@/components/ui";
import type { Question, OptionKey } from "@/types";

interface QuestionFormProps {
  initialValue?: Partial<Question>;
  onSubmit: (values: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: OptionKey;
    explanation: string;
  }) => void;
  submitLabel?: string;
}

// প্রশ্ন বানানো/এডিট করার ফর্ম — question_text এ $...$ দিয়ে math ফর্মুলা লেখা যাবে
export default function QuestionForm({ initialValue, onSubmit, submitLabel = "প্রশ্ন যোগ করো" }: QuestionFormProps) {
  const [questionText, setQuestionText] = useState(initialValue?.question_text ?? "");
  const [optionA, setOptionA] = useState(initialValue?.option_a ?? "");
  const [optionB, setOptionB] = useState(initialValue?.option_b ?? "");
  const [optionC, setOptionC] = useState(initialValue?.option_c ?? "");
  const [optionD, setOptionD] = useState(initialValue?.option_d ?? "");
  const [correct, setCorrect] = useState<OptionKey>(initialValue?.correct_option ?? "A");
  const [explanation, setExplanation] = useState(initialValue?.explanation ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correct,
      explanation,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="প্রশ্ন ফর্ম">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="question-text" className="text-sm font-medium text-ink-soft">
          প্রশ্ন (math এর জন্য $...$ ব্যবহার করো, যেমন: $x^2+1$)
        </label>
        <textarea
          id="question-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
          rows={3}
          className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
        <Input label="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
        <Input label="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
        <Input label="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="correct-option" className="text-sm font-medium text-ink-soft">
          সঠিক উত্তর
        </label>
        <select
          id="correct-option"
          value={correct}
          onChange={(e) => setCorrect(e.target.value as OptionKey)}
          className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
          <option value="D">D</option>
        </select>
      </div>

      <Input
        label="ব্যাখ্যা (ঐচ্ছিক)"
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
      />

      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
