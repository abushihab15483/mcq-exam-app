import Card from "@/components/ui/Card";
import MathRenderer from "@/components/shared/MathRenderer";
import { cn } from "@/lib/utils";
import type { PublicQuestion, OptionKey } from "@/types";

interface QuestionCardProps {
  question: PublicQuestion;
  index: number;
  total: number;
  selected: OptionKey | null;
  onSelect: (option: OptionKey) => void;
}

const optionOrder: OptionKey[] = ["A", "B", "C", "D"];

// প্রশ্ন + ৪টা option (radio buttons, keyboard দিয়ে full navigable, screen reader friendly)
export default function QuestionCard({ question, index, total, selected, onSelect }: QuestionCardProps) {
  const optionText: Record<OptionKey, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };

  return (
    <Card>
      <fieldset>
        <legend className="mb-3 flex items-baseline gap-2">
          <span className="font-mono text-sm text-gold">
            {index + 1}/{total}
          </span>
          <span className="sr-only">নম্বর প্রশ্ন। </span>
        </legend>
        <MathRenderer text={question.question_text} className="font-display text-lg text-ink mb-4" />
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={`প্রশ্ন ${index + 1} এর অপশনসমূহ`}>
          {optionOrder.map((key) => {
            const isSelected = selected === key;
            return (
              <label
                key={key}
                className={cn(
                  "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-card border px-4 py-2.5 transition-colors",
                  isSelected
                    ? "border-gold bg-gold/10"
                    : "border-border bg-white hover:bg-black/[0.02]"
                )}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={key}
                  checked={isSelected}
                  onChange={() => onSelect(key)}
                  className="h-4 w-4 accent-gold shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                />
                <span className="font-mono text-sm text-ink-soft shrink-0">{key}</span>
                <MathRenderer text={optionText[key]} className="text-ink font-body" />
              </label>
            );
          })}
        </div>
      </fieldset>
    </Card>
  );
}
