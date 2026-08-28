"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

// নতুন লিংক যোগ করতে হলে শুধু এই array তে একটা লাইন যোগ করলেই হবে
const links: NavLink[] = [
  { href: "/dashboard", label: "ড্যাশবোর্ড" },
  { href: "/exams", label: "পরীক্ষাসমূহ" },
  { href: "/results", label: "ফলাফল" },
  { href: "/messages", label: "মেসেজ" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // রুট বদলালে মোবাইল ড্রয়ার বন্ধ হয়ে যাবে
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function renderLinks() {
    return links.map((link) => {
      const isActive = pathname.startsWith(link.href);
      return (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "block rounded-r-card border-l-2 py-2 pl-3 pr-3 font-body text-sm font-medium transition-colors",
            isActive
              ? "border-gold bg-gold/10 text-ink"
              : "border-transparent text-ink-soft hover:bg-black/[0.03] hover:text-ink"
          )}
        >
          {link.label}
        </Link>
      );
    });
  }

  const sidebarContent = (
    <>
      <div className="px-4 py-5">
        <span className="font-display text-base font-semibold text-ink">অ্যাডমিন প্যানেল</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="অ্যাডমিন নেভিগেশন">
        {renderLinks()}
      </nav>
      <div className="mt-auto border-t border-border p-3">
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          লগআউট
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* মোবাইল টপ বার */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 md:hidden">
        <span className="font-display text-base font-semibold text-ink">অ্যাডমিন প্যানেল</span>
        <button
          type="button"
          aria-label="মেনু খুলুন"
          aria-expanded={isDrawerOpen}
          onClick={() => setIsDrawerOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-card text-ink hover:bg-black/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* মোবাইল ড্রয়ার + ব্যাকড্রপ */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="মেনু বন্ধ করুন"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative z-50 flex h-full w-64 flex-col bg-white shadow-lift">{sidebarContent}</div>
        </div>
      )}

      {/* ডেস্কটপ সাইডবার */}
      <aside className="hidden border-r border-border bg-white md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
