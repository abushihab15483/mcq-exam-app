import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import HeroSlider from "@/components/coaching/HeroSlider";
import ExamCountdownCard from "@/components/coaching/ExamCountdownCard";
import ContactForm from "@/components/coaching/ContactForm";
import FaqAccordion from "@/components/coaching/FaqAccordion";
import CountUpStat from "@/components/coaching/CountUpStat";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { Card } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_RUNNING_EXAM } from "@/lib/demo-exams";
import { siteConfig } from "@/lib/seo";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "হোম",
  description:
    "জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার অংকুর জামালপুর শাখা — অষ্টম থেকে দ্বাদশ শ্রেণির জন্য প্র্যাকটিস এক্সাম, লাইভ এক্সাম ও ফলাফল একসাথে। বাংলাদেশের যেকোনো জায়গা থেকে অংশগ্রহণ করা যায়।",
  alternates: { canonical: "/" },
  openGraph: {
    title: "অংকুর জামালপুর শাখা — অনলাইন এমসিকিউ পরীক্ষা",
    description:
      "জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার — অষ্টম থেকে দ্বাদশ শ্রেণির জন্য প্র্যাকটিস এক্সাম, লাইভ এক্সাম ও ফলাফল একসাথে।",
    url: "/",
    // নিজের openGraph override করলে Next.js এর file-convention (app/opengraph-image.jpg)
    // থেকে auto-inject হওয়া ছবি আর যোগ হয় না — তাই এখানে explicit ভাবে বসিয়ে
    // দেওয়া হলো, নাহলে হোমপেজ শেয়ার করলে ছবি ছাড়া শুধু টেক্সট দেখাত।
    images: ["/opengraph-image.jpg"],
  },
};

const WHY_US = [
  {
    title: "অভিজ্ঞ শিক্ষক প্যানেল",
    desc: "প্রতিটি বিষয়ে বছরের পর বছরের অভিজ্ঞতাসম্পন্ন শিক্ষকদের হাতে গড়া পাঠপরিকল্পনা।",
    icon: <path d="M12 3l10 5-10 5L2 8z M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5 M22 8v6" />,
  },
  {
    title: "১০,০০০+ প্র্যাকটিস প্রশ্ন",
    desc: "প্রতিটি অধ্যায় ও বিষয়ভিত্তিক বিশাল প্রশ্নভাণ্ডার থেকে ইচ্ছেমতো প্র্যাকটিস করার সুযোগ।",
    icon: <path d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17l9 5 9-5" />,
  },
  {
    title: "রিয়েল-টাইম ফলাফল বিশ্লেষণ",
    desc: "প্রতিটি পরীক্ষার পর নিজের ভুল ও অগ্রগতি স্পষ্টভাবে বুঝে নেওয়ার সুবিধা।",
    icon: <path d="M4 20V10 M12 20V4 M20 20v-7 M2 20h20" />,
  },
];

const FEATURES = [
  {
    title: "টাইমড মক টেস্ট",
    desc: "আসল পরীক্ষার পরিবেশ অনুভব করার জন্য নির্দিষ্ট সময়সীমার মধ্যে প্র্যাকটিস।",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
  },
  {
    title: "তাৎক্ষণিক ফলাফল ও র‍্যাঙ্ক",
    desc: "পরীক্ষা শেষ হওয়ার সাথে সাথেই নিজের স্কোর ও অবস্থান জানার সুযোগ।",
    icon: <path d="M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M7 5H4a3 3 0 0 0 3 5 M17 5h3a3 3 0 0 1-3 5" />,
  },
  {
    title: "পারফরম্যান্স ট্র্যাকিং",
    desc: "সময়ের সাথে নিজের উন্নতির ধারা লক্ষ্য করে দুর্বল জায়গাগুলো চিহ্নিত করা।",
    icon: <path d="M3 17l6-6 4 4 8-8 M15 6h6v6" />,
  },
];

const STATS = [
  {
    target: 1200,
    suffix: "+",
    label: "শিক্ষার্থী",
    icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />,
  },
  {
    target: 20,
    suffix: "+",
    label: "অভিজ্ঞ শিক্ষক",
    icon: <path d="M12 3l10 5-10 5L2 8z M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />,
  },
  {
    target: 250,
    suffix: "+",
    label: "বছরে পরীক্ষা অনুষ্ঠিত",
    icon: <path d="M9 12l2 2 4-4 M12 3l9 4v5c0 4.5-3 8-9 9-6-1-9-4.5-9-9V7z" />,
  },
  {
    target: 99,
    suffix: "%",
    label: "সন্তুষ্ট শিক্ষার্থী",
    icon: <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.6 6.8L12 17l-6.2 3.4 1.6-6.8-5.2-4.6 6.9-.7z" />,
  },
];

// এখন যেটা চলছে সেটাই আগে, নাহলে সবচেয়ে কাছের আসন্ন পরীক্ষা — কোনো বাস্তব পরীক্ষা না
// থাকলে ডামি পরীক্ষা দিয়ে দেখানো হয় যাতে UI-টা ফাঁকা না লাগে
//
// আগে সব published exam fetch করে JS দিয়ে (.find) running/upcoming বের করা
// হতো — exam যত বাড়বে ততই অপ্রয়োজনীয় ডেটা আসতো। এখন DB নিজেই ফিল্টার করে,
// প্রতিটা query তে সর্বোচ্চ ১টা row (.limit(1)) — running পাওয়া গেলে upcoming
// query-ই চালানো হয় না।
async function getFeaturedExam() {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const columns = "id, title, start_time, end_time, duration_minutes";

    const { data: runningRows } = await supabase
      .from("exams")
      .select(columns)
      .eq("status", "published")
      .lte("start_time", nowIso)
      .gte("end_time", nowIso)
      .order("start_time", { ascending: true })
      .limit(1);

    let exam = runningRows?.[0];

    if (!exam) {
      const { data: upcomingRows } = await supabase
        .from("exams")
        .select(columns)
        .eq("status", "published")
        .gt("start_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(1);
      exam = upcomingRows?.[0];
    }

    if (exam) {
      return {
        title: exam.title,
        meta: `সময়কাল: ${exam.duration_minutes} মিনিট`,
        examDateTime: exam.start_time,
      };
    }
  } catch {
    // DB এখনো কনফিগার না থাকলে বা ফেচ ব্যর্থ হলে নিচের ডামি দেখানো হবে
  }

  return {
    title: DEMO_RUNNING_EXAM.title,
    meta: `সময়কাল: ${DEMO_RUNNING_EXAM.duration_minutes} মিনিট`,
    examDateTime: DEMO_RUNNING_EXAM.start_time,
  };
}

export default async function HomePage() {
  const featuredExam = await getFeaturedExam();

  // Structured data (JSON-LD) — Google কে সরাসরি বলে দেয় এটা কোন ধরনের ব্যবসা,
  // কোথায় অবস্থিত, ফোন নাম্বার কী। এইটা থাকলে "জামালপুর কোচিং সেন্টার" এর মতো
  // লোকাল সার্চে এবং Google Maps/Knowledge Panel এ দেখানোর সম্ভাবনা বাড়ে।
  // sameAs (ফেসবুক/ইউটিউব লিংক) এখনো ফাঁকা — lib/seo.ts এ siteConfig.social এ
  // আসল লিংক বসালে এখানে নিজে থেকেই যোগ হয়ে যাবে।
  const orgSameAs = Object.values(siteConfig.social).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: siteConfig.name,
    alternateName: "Ankur Jamalpur",
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logoPath}`,
    image: `${siteConfig.url}${siteConfig.logoPath}`,
    description: siteConfig.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.streetAddress,
      addressLocality: siteConfig.address.addressLocality,
      addressRegion: siteConfig.address.addressRegion,
      addressCountry: siteConfig.address.addressCountry,
    },
    telephone: siteConfig.phones[0],
    areaServed: {
      "@type": "Country",
      name: "Bangladesh",
    },
    ...(orgSameAs.length > 0 ? { sameAs: orgSameAs } : {}),
  };

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal />
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          {/* গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড — gold ও ink টোনের নরম আলো, উপর থেকে ছড়িয়ে যাচ্ছে */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[30rem] bg-[radial-gradient(ellipse_60%_55%_at_20%_0%,rgba(169,118,47,0.14),transparent_65%),radial-gradient(ellipse_50%_45%_at_100%_10%,rgba(28,35,51,0.06),transparent_60%),linear-gradient(to_bottom,rgba(217,185,120,0.08),transparent)]"
          />
          {/* লাইন গ্রিড — হিরো সেকশন জুড়ে হালকা টেকনিক্যাল টেক্সচার */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-line-grid bg-grid opacity-[0.5] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-dot-grid bg-dots opacity-70 [mask-image:radial-gradient(circle,black,transparent_70%)]"
          />

          <div className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-16">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="reveal-up">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3.5 py-1.5 text-xs font-semibold text-gold">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" /> জামালপুরের #১ কোচিং সেন্টার
                </span>
                <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.35] tracking-tight text-ink sm:text-[2.75rem]">
                  তোমার পড়াশোনার দুশ্চিন্তা দূর হোক, <span className="text-gold">আমাদের সাথে</span>
                </h1>
                <p className="mt-4 max-w-md text-[15px] leading-[1.8] text-ink-soft">
                  প্র্যাকটিস এক্সাম, লাইভ এক্সাম আর তাৎক্ষণিক ফলাফল — সব একসাথে, একই প্ল্যাটফর্মে। প্রতিদিন প্রস্তুতি নাও, নিজেকে যাচাই করো।
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/live"
                    className="rounded-card bg-ink px-6 py-3 text-sm font-semibold text-paper shadow-soft transition-all hover:-translate-y-0.5 hover:bg-ink/90 hover:shadow-lift"
                  >
                    পরীক্ষা দিতে যাও
                  </Link>
                  <Link
                    href="/result"
                    className="rounded-card border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-soft"
                  >
                    ফলাফল দেখো
                  </Link>
                </div>
              </div>

              <div className="reveal-up" style={{ transitionDelay: "120ms" }}>
                <HeroSlider />
              </div>
            </div>
          </div>
        </section>

        {/* UPCOMING LIVE EXAM */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="reveal-up">
            <ExamCountdownCard
              title={featuredExam.title}
              classChip="এসএসসি"
              meta={featuredExam.meta}
              examDateTime={featuredExam.examDateTime}
              href="/exam"
            />
          </div>
        </section>

        {/* WHY US */}
        <section className="relative overflow-hidden px-5 pb-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-line-grid bg-grid opacity-60 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent_75%)]"
          />
          <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center reveal-up">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">কেন অনুশীলন</span>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">কেন আমাদের বেছে নেবে</h2>
            <p className="mt-3 leading-[1.8] text-ink-soft">হাজারো শিক্ষার্থীর আস্থা অর্জন করেছে অনুশীলন — মানসম্মত শিক্ষকমণ্ডলী থেকে শুরু করে নিয়মিত মূল্যায়ন পর্যন্ত।</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_US.map((item, i) => (
              <Card
                key={item.title}
                className="reveal-up shadow-none transition-all duration-200 hover:-translate-y-1 hover:border-gold/30 hover:shadow-soft"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-card bg-ink/5 text-ink">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {item.icon}
                  </svg>
                </div>
                <h3 className="mt-4 font-display font-semibold leading-snug text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-[1.75] text-ink-faint">{item.desc}</p>
              </Card>
            ))}
          </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-white/60 py-16">
          <div className="mx-auto max-w-6xl px-5">
            <div className="mx-auto max-w-xl text-center reveal-up">
              <span className="text-xs font-semibold uppercase tracking-wide text-gold">সুযোগ-সুবিধা</span>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">প্ল্যাটফর্মের বৈশিষ্ট্য</h2>
              <p className="mt-3 leading-[1.8] text-ink-soft">পরীক্ষার প্রস্তুতিকে সহজ ও কার্যকর করতে অনুশীলনে যা যা পাবে।</p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {FEATURES.map((item, i) => (
                <Card
                  key={item.title}
                  className="reveal-up flex flex-row gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
                  style={{ transitionDelay: `${i * 90}ms` }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-gold/10 text-gold">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold leading-snug text-ink">{item.title}</h3>
                    <p className="mt-1 text-sm leading-[1.75] text-ink-faint">{item.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="relative overflow-hidden bg-ink py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-dot-grid bg-dots opacity-[0.06] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 sm:gap-5 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className="reveal-up rounded-card border border-paper/10 bg-paper/[0.06] p-6 text-center transition-colors hover:bg-paper/[0.1]"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {s.icon}
                  </svg>
                </div>
                <span className="mt-3 block font-mono text-2xl font-semibold text-paper sm:text-3xl">
                  <CountUpStat target={s.target} suffix={s.suffix} />
                </span>
                <span className="mt-1 block text-xs text-paper/60">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="mx-auto max-w-6xl px-5 py-16">
          <div className="mx-auto max-w-xl text-center reveal-up">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">যোগাযোগ</span>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">আমাদের সাথে যোগাযোগ করুন</h2>
            <p className="mt-3 leading-[1.8] text-ink-soft">ভর্তি, ক্লাস রুটিন বা যেকোনো প্রশ্নের জন্য নিচের ফর্মটি পূরণ করো অথবা সরাসরি আমাদের সাথে যোগাযোগ করো।</p>
          </div>

          <div className="reveal-up mx-auto mt-10 max-w-2xl" style={{ transitionDelay: "100ms" }}>
            <ContactForm />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-6xl px-5 pb-20">
          <div className="mx-auto max-w-xl text-center reveal-up">
            <span className="text-xs font-semibold uppercase tracking-wide text-gold">সচরাচর জিজ্ঞাসা</span>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">তোমার প্রশ্নের উত্তর</h2>
          </div>
          <div className="reveal-up mx-auto mt-10 max-w-2xl" style={{ transitionDelay: "100ms" }}>
            <FaqAccordion />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
