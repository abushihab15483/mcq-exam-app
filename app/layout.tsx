import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Anek_Bangla } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/seo";

// Body/UI face (Latin) — এটাই headline সহ সব Latin টেক্সটে ব্যবহার হয়; ফন্ট ফ্যামিলি
// সংখ্যা কমাতে আলাদা Fraunces সরিয়ে display-ও এই একই Inter var ব্যবহার করে (নিচে
// tailwind.config.ts এর fontFamily.display দ্রষ্টব্য), যাতে ফন্ট দুইবার লোড না হয়
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

// Mono face — timer, roll number, score এর মতো সংখ্যার জন্য
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

// বাংলা হেডিং + বডি + UI, সব একটা মাত্র Anek Bangla instance থেকে — আগে display/body
// এর জন্য দুইটা আলাদা instance ছিল (600/700 আর 400/500/600), যেটা weight 600 দুইবার
// ডাউনলোড করাতো। এখন একটাই instance, সব ব্যবহৃত weight (400/500/600/700) একসাথে —
// juktakkhor/matra স্পষ্ট আর ভারী ওজনেও পরিষ্কার দেখায় (Inter-এ বাংলা গ্লিফ নাই বলে fallback চেইনে বসবে)
const bengali = Anek_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bn",
});

// SEO — এই metadata object root layout এ থাকায় পুরো সাইটের ডিফল্ট হিসেবে কাজ করে।
// প্রতিটা page.tsx নিজের title/description ওভাররাইড করে (দেখো app/(public)/page.tsx
// ইত্যাদি) — title.template এর কারণে সেগুলোর ছোট title (যেমন "হোম") স্বয়ংক্রিয়ভাবে
// "হোম | অংকুর জামালপুর শাখা" হয়ে যায়, প্রতিটা পেজে পুরো সাফিক্স আলাদা করে লিখতে হয় না।
//
// icons (favicon/apple-icon) আর manifest ম্যানুয়ালি এখানে বসানো হয়নি — Next.js
// app/icon.png, app/apple-icon.png, app/manifest.ts, আর app/opengraph-image.jpg
// ফাইল থাকলেই এগুলো নিজে থেকে detect করে metadata এ জুড়ে দেয়।
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.titleDefault,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  // canonical URL রুট এখানে বসানো হয়নি ইচ্ছাকৃতভাবে — Next.js এ metadata field
  // parent থেকে child এ inherit হয় যদি child নিজে override না করে। এখানে বসালে
  // যেসব পেজ নিজের alternates সেট করে না, তারা সবাই "/" কেই canonical ধরে নিত
  // (ভুল)। তাই প্রতিটা পেজ নিজের canonical নিজে সেট করে (দেখো app/(public)/*/page.tsx)।
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.titleDefault,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.titleDefault,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Google Search Console এ সাইট verify করার পর এখানে বসাও:
  // verification: { google: "তোমার-verification-code" },
};

// theme_color manifest.ts এর background_color/theme_color এর সাথে মিলিয়ে —
// Android/iOS এ address bar আর "Add to Home Screen" splash screen এই কালারই দেখাবে।
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1C2333",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bn"
      className={`${body.variable} ${mono.variable} ${bengali.variable}`}
    >
      <body className="bg-paper text-ink font-body antialiased">{children}</body>
    </html>
  );
}
