// পেন্সিল লোডিং অ্যানিমেশন — pure SVG + CSS keyframes (app/globals.css এ সংজ্ঞায়িত)।
// styled-components জাতীয় CSS-in-JS লাইব্রেরি ইচ্ছাকৃতভাবে ব্যবহার করা হয়নি: এতে extra
// dependency/bundle size লাগত এবং প্রতিটা render-এ runtime style-injection cost যোগ হতো।
// এখানে CSS একবার (globals.css এর সাথে) parse হয়, animation পুরোটা GPU/compositor-এ চলে —
// তাই page যতই বার লোডার দেখাক, performance-এ কোনো প্রভাব পড়ে না।
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-14 w-14",
  lg: "h-24 w-24",
};

interface LoaderProps {
  size?: Size;
  /** স্ক্রিন-রিডারের জন্য লেবেল; দৃশ্যমান টেক্সট আলাদাভাবে দেখাতে চাইলে label prop দিন */
  label?: string;
  /** true হলে label টি চোখে দেখা যাবে (নাহলে শুধু sr-only) */
  showLabel?: boolean;
  className?: string;
  /** true হলে পুরো viewport ঢেকে center করে দেখাবে (ফুল-পেজ লোডিং স্টেটের জন্য) */
  fullPage?: boolean;
}

function PencilSvg({ size, className }: { size: Size; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pencil-loader", sizeClasses[size], className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="pencil-loader-eraser">
          <rect height={30} width={30} ry={5} rx={5} />
        </clipPath>
      </defs>
      <circle
        transform="rotate(-113,100,100)"
        strokeLinecap="round"
        strokeDashoffset="439.82"
        strokeDasharray="439.82 439.82"
        strokeWidth={2}
        stroke="currentColor"
        fill="none"
        r={70}
        className="pencil-loader__stroke text-gold"
      />
      <g transform="translate(100,100)" className="pencil-loader__rotate">
        <g fill="none">
          <circle
            transform="rotate(-90)"
            strokeDashoffset={402}
            strokeDasharray="402.12 402.12"
            strokeWidth={30}
            stroke="#1C2333"
            r={64}
            className="pencil-loader__body1"
          />
          <circle
            transform="rotate(-90)"
            strokeDashoffset={465}
            strokeDasharray="464.96 464.96"
            strokeWidth={10}
            stroke="#4A5268"
            r={74}
            className="pencil-loader__body2"
          />
          <circle
            transform="rotate(-90)"
            strokeDashoffset={339}
            strokeDasharray="339.29 339.29"
            strokeWidth={10}
            stroke="#0F1420"
            r={54}
            className="pencil-loader__body3"
          />
        </g>
        <g transform="rotate(-90) translate(49,0)" className="pencil-loader__eraser">
          <g className="pencil-loader__eraser-skew">
            <rect height={30} width={30} ry={5} rx={5} fill="#D9B978" />
            <rect clipPath="url(#pencil-loader-eraser)" height={30} width={5} fill="#A9762F" />
            <rect height={20} width={30} fill="#F7F7F5" />
            <rect height={20} width={15} fill="#E2E4E9" />
            <rect height={20} width={5} fill="#EDEEF1" />
            <rect height={2} width={30} y={6} fill="rgba(28,35,51,0.2)" />
            <rect height={2} width={30} y={13} fill="rgba(28,35,51,0.2)" />
          </g>
        </g>
        <g transform="rotate(-90) translate(49,-30)" className="pencil-loader__point">
          <polygon points="15 0,30 30,0 30" fill="#D9B978" />
          <polygon points="15 0,6 30,0 30" fill="#A9762F" />
          <polygon points="15 0,20 10,10 10" fill="#1C2333" />
        </g>
      </g>
    </svg>
  );
}

export default function Loader({
  size = "md",
  label = "লোড হচ্ছে...",
  showLabel = true,
  className,
  fullPage = false,
}: LoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)} role="status">
      <PencilSvg size={size} />
      <span className={showLabel ? "text-sm text-ink-soft" : "sr-only"}>{label}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center py-10">{content}</div>
    );
  }

  return content;
}
