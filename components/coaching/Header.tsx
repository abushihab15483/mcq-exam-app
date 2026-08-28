"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "হোম" },
  { href: "/about", label: "আমাদের সম্পর্কে" },
  { href: "/live", label: "লাইভ এক্সাম" },
  { href: "/exam", label: "পরীক্ষাসমূহ" },
  { href: "/result", label: "ফলাফল" },
  { href: "/contact", label: "যোগাযোগ" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image
            src="/images/coaching/logo-ankur-jamalpur.webp"
            alt="অংকুর জামালপুর শাখা লোগো"
            width={40}
            height={40}
            className="rounded-full"
            priority
          />
          <span className="font-display font-semibold text-ink leading-tight">
            অংকুর
            <span className="block text-xs font-body font-medium text-ink-faint">জামালপুর শাখা</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-card px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.03] hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="মেনু খুলুন অথবা বন্ধ করুন"
          className="flex h-10 w-10 items-center justify-center rounded-card border border-border lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      <nav
        id="mobile-nav"
        className={cn("border-t border-border px-5 py-3 lg:hidden", open ? "block" : "hidden")}
      >
        <ul className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-card px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-black/[0.03] hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
