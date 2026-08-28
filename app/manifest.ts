import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

// এই ফাইল /manifest.webmanifest এ সার্ভ হবে (Next.js নিজে থেকেই <link rel="manifest">
// পেজে জুড়ে দেয়)। এর মূল কাজ দুইটা:
// ১. মোবাইলে "Add to Home Screen" করলে সঠিক নাম, আইকন, থিম কালার দেখাবে (অনেক
//    ছাত্রছাত্রী পরীক্ষার দিন সহজে ঢোকার জন্য হোমস্ক্রিনে শর্টকাট রাখে)।
// ২. Google-এর mobile-friendliness/PWA সিগন্যালে সাহায্য করে।
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — অনলাইন এমসিকিউ পরীক্ষা`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F5",
    theme_color: "#1C2333",
    lang: "bn-BD",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
