import { cn } from "@/lib/utils";
import type { OptionKey } from "@/types";

interface ReviewQuestion {
  id: string;
  question_text: string;
  options: Record<OptionKey, string>;
  correct_option: OptionKey;
  selected_option: OptionKey | null;
  is_correct: boolean;
  is_skipped: boolean;
  explanation: string | null;
}

interface ReviewListProps {
  questions: ReviewQuestion[];
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

// পরীক্ষা শেষে exam এর end_time পার হওয়ার পর — প্রতিটা প্রশ্নে student কী দিয়েছিল,
// সঠিক উত্তর কী ছিল, এবং ভুল/ঠিক/স্কিপ — সব একসাথে দেখায়।
export default function ReviewList({ questions }: ReviewListProps) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div
          key={q.id}
          className={cn(
            "rounded-card border p-4",
            q.is_skipped
              ? "border-border bg-black/[0.02]"
              : q.is_correct
              ? "border-success/30 bg-success/5"
              : "border-danger/30 bg-danger/5"
          )}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <p className="font-medium text-ink">
              {i + 1}. {q.question_text}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                q.is_skipped
                  ? "bg-black/[0.06] text-ink-soft"
                  : q.is_correct
                  ? "bg-success/15 text-success"
                  : "bg-danger/15 text-danger"
              )}
            >
              {q.is_skipped ? "স্কিপ করা" : q.is_correct ? "সঠিক" : "ভুল"}
            </span>
          </div>

          <div className="space-y-1.5">
            {OPTION_KEYS.map((key) => {
              const isCorrectOption = key === q.correct_option;
              const isSelectedOption = key === q.selected_option;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    isCorrectOption
                      ? "border-success/40 bg-success/10 text-success"
                      : isSelectedOption
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : "border-border text-ink-soft"
                  )}
                >
                  <span className="font-semibold">{key}.</span> {q.options[key]}
                  {isCorrectOption && <span className="ml-2 text-xs">(সঠিক উত্তর)</span>}
                  {isSelectedOption && !isCorrectOption && <span className="ml-2 text-xs">(তোমার উত্তর)</span>}
                </div>
              );
            })}
          </div>

          {q.explanation && <p className="mt-2 text-sm text-ink-soft">💡 {q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}
