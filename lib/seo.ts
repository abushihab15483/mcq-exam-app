// কেন্দ্রীয় SEO কনফিগ — সাইটের নাম, URL, বর্ণনা, ঠিকানা, ফোন নাম্বার — এই সব তথ্য
// এক জায়গায় রাখা হলো যাতে metadata, robots.ts, sitemap.ts, আর structured data
// (JSON-LD) সব জায়গায় একই তথ্য ব্যবহার হয়। Vercel এ NEXT_PUBLIC_SITE_URL env var
// বসালে সেটাই ব্যবহার হবে, না বসালে নিচের আসল ডোমেইন (fallback) ব্যবহার হবে।
//
// ঠিকানা/ফোন hero poster ছবি থেকে নেওয়া, ইমেইল/সোশ্যাল লিংক ব্যবহারকারীর দেওয়া আসল তথ্য।

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ankurcoaching.com";

export const siteConfig = {
  name: "অংকুর জামালপুর শাখা",
  shortName: "অংকুর জামালপুর",
  // .replace দিয়ে শেষের / বাদ দেওয়া হলো, যাতে metadataBase / sitemap এ ডাবল // না বসে
  url: rawSiteUrl.replace(/\/+$/, ""),
  titleDefault: "অংকুর জামালপুর শাখা — অনলাইন এমসিকিউ পরীক্ষা",
  titleTemplate: "%s | অংকুর জামালপুর শাখা",
  description:
    "জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার অংকুর জামালপুর শাখার অনলাইন এমসিকিউ পরীক্ষা প্ল্যাটফর্ম — অষ্টম থেকে দ্বাদশ শ্রেণির (SSC, HSC) শিক্ষার্থীদের জন্য প্র্যাকটিস এক্সাম, লাইভ এক্সাম ও রিয়েল-টাইম ফলাফল, বাংলাদেশের যেকোনো জায়গা থেকে অংশগ্রহণ করা যায়।",
  keywords: [
    "অনলাইন এমসিকিউ পরীক্ষা",
    "জামালপুর কোচিং সেন্টার",
    "অংকুর জামালপুর",
    "অংকুর কোচিং সেন্টার",
    "HSC অনলাইন পরীক্ষা",
    "SSC অনলাইন পরীক্ষা",
    "একাদশ দ্বাদশ শ্রেণির পরীক্ষা",
    "অনলাইন মডেল টেস্ট বাংলাদেশ",
    "জামালপুর সেরা কোচিং সেন্টার",
    "ময়মনসিংহ কোচিং সেন্টার",
    "লাইভ এক্সাম",
    "online mcq exam Bangladesh",
    "Jamalpur coaching center",
    "Ankur Jamalpur",
  ],
  locale: "bn_BD",
  // ব্যবসার ঠিকানা — hero poster থেকে নেওয়া আসল তথ্য (public/images/coaching/hero-poster-1.jpg)
  address: {
    streetAddress: "রেখা প্লাজা, পাঁচরাস্তা মোড়",
    addressLocality: "জামালপুর",
    addressRegion: "ময়মনসিংহ বিভাগ",
    postalCode: "2000",
    addressCountry: "BD",
  },
  // ফোন নাম্বার — hero poster থেকে নেওয়া আসল তথ্য
  phones: ["+8801718523996", "+8801675204113"],
  email: "almamunjamalpur@gmail.com",
  social: {
    facebook: "https://www.facebook.com/share/1EZZ3afjqp/",
    youtube: "",
    whatsapp: "https://wa.me/8801718523996",
  },
  logoPath: "/images/coaching/logo-ankur-jamalpur.jpg",
} as const;
