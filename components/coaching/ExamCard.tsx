import Link from "next/link";

export type ExamCardStatus = "running" | "upcoming" | "finished";

interface Props {
  title: string;
  meta: string;
  href: string;
  linkLabel: string;
  status: ExamCardStatus;
  /** একই ধরনের কার্ড যাতে ভিন্ন ভিন্ন দেখায় — index দিয়ে থিম সাইকেল করা হয় */
  index?: number;
}

// প্রতিটা থিম: gradient background, label chip রং আর একটা বড় decorative আইকন
const THEMES = [
  {
    bg: "from-[#FBEEE0] via-[#FBEEE0] to-[#F6DDC4]",
    chip: "bg-white text-[#B4652C]",
    blob: "bg-[#E7A468]/45",
    icon: "text-[#C97C3B]/60",
  },
  {
    bg: "from-[#ECEAF7] via-[#ECEAF7] to-[#DAD5F2]",
    chip: "bg-white text-[#6A57B8]",
    blob: "bg-[#9C8AE0]/45",
    icon: "text-[#7C67C9]/60",
  },
  {
    bg: "from-[#E6F3E7] via-[#E6F3E7] to-[#D0E9D3]",
    chip: "bg-white text-[#2F6B4F]",
    blob: "bg-[#7FBF8B]/45",
    icon: "text-[#3F8A57]/60",
  },
  {
    bg: "from-[#FBEAF4] via-[#FBEAF4] to-[#F4D3E9]",
    chip: "bg-white text-[#B04A87]",
    blob: "bg-[#E191C4]/45",
    icon: "text-[#C463A0]/60",
  },
] as const;

const STATUS_LABEL: Record<ExamCardStatus, string> = {
  running: "চলমান",
  upcoming: "আসন্ন",
  finished: "সমাপ্ত",
};

// status অনুযায়ী একটা বড় decorative icon path — clock (চলমান), calendar (আসন্ন), check-badge (সমাপ্ত)
const STATUS_ICON: Record<ExamCardStatus, JSX.Element> = {
  running: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2 M9 2h6" />
    </>
  ),
  upcoming: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18 M8 2v4 M16 2v4 M8 14h3" />
    </>
  ),
  finished: (
    <>
      <path d="M12 2l2.6 1.5 3-.3.8 2.9 2.6 1.6-1.1 2.8 1.1 2.8-2.6 1.6-.8 2.9-3-.3L12 19l-2.6-1.5-3 .3-.8-2.9-2.6-1.6 1.1-2.8L3 7.7l2.6-1.6.8-2.9 3 .3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

export default function ExamCard({ title, meta, href, linkLabel, status, index = 0 }: Props) {
  const theme = THEMES[index % THEMES.length];

  return (
    <div
      className={`group relative overflow-hidden rounded-card border border-black/[0.04] bg-gradient-to-br ${theme.bg} p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift`}
    >
      {/* decorative blob + বড় আইকন */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full ${theme.blob} blur-0 transition-transform duration-500 group-hover:scale-110`}
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`pointer-events-none absolute -bottom-3 -right-3 h-32 w-32 ${theme.icon} transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3`}
      >
        {STATUS_ICON[status]}
      </svg>

      <div className="relative">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${theme.chip}`}>
          {STATUS_LABEL[status]}
        </span>

        <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">{title}</h3>
        <p className="mt-2 max-w-[80%] text-sm leading-[1.7] text-ink-soft">{meta}</p>

        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-ink/30 decoration-2 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold"
        >
          {linkLabel}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
