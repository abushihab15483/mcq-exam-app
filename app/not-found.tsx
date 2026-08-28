import Link from "next/link";
import { Button } from "@/components/ui";

// অস্তিত্বহীন/ভুল রুটে গেলে Next.js এই পেজ দেখাবে (App Router-এর built-in not-found
// convention) — root layout (html/body/font) অক্ষত থাকে।
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] w-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-card border border-border bg-white px-6 py-8 text-center shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink">
          পেজটি খুঁজে পাওয়া যায়নি
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          আপনি যে পেজটি খুঁজছেন সেটি হয়তো সরিয়ে ফেলা হয়েছে বা লিংকটি সঠিক নয়।
        </p>
        <Link href="/" className="mt-4 inline-block">
          <Button type="button">হোমপেজে ফিরে যাও</Button>
        </Link>
      </div>
    </main>
  );
}
