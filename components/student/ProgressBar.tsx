interface ProgressBarProps {
  answered: number;
  total: number;
}

// কতগুলো প্রশ্নের উত্তর দেওয়া হয়েছে তা দেখায় — timer এর নিচে বসবে
export default function ProgressBar({ answered, total }: ProgressBarProps) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-ink-soft font-body">উত্তর দেওয়া হয়েছে</span>
        <span className="font-mono text-sm text-ink-soft tabular-nums">
          {answered}/{total}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-black/[0.06]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="উত্তর দেওয়ার অগ্রগতি"
      >
        <div className="h-full rounded-full bg-success transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
