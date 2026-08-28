import { cn } from "@/lib/utils";

interface ScoreSealProps {
  score: number;
  total: number;
  label?: string;
  className?: string;
}

// এই app এর "signature" element — সার্টিফিকেট/মার্কশিটের স্ট্যাম্পের মতো দেখতে।
// ResultPage আর Leaderboard এ score/rank দেখানোর জন্য ব্যবহার হবে (Step 4)।
export default function ScoreSeal({ score, total, label, className }: ScoreSealProps) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div
      className={cn(
        "relative flex h-28 w-28 flex-col items-center justify-center rounded-full",
        "border-2 border-gold ring-1 ring-gold/30 ring-offset-4 ring-offset-paper bg-white",
        className
      )}
    >
      <span className="font-mono text-2xl font-semibold text-ink">
        {score}/{total}
      </span>
      <span className="font-mono text-xs text-gold">{percent}%</span>
      {label && (
        <span className="absolute -bottom-6 whitespace-nowrap text-xs font-body text-ink-soft">
          {label}
        </span>
      )}
    </div>
  );
}
