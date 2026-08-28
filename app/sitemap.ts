import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

// শুধু স্ট্যাটিক, ইনডেক্সযোগ্য পাবলিক পেজগুলো এখানে রাখা হয়েছে।
// /exam/[examId] (আসল exam attempt পেজ, টাইমার-চালিত, এক স্টুডেন্ট একবারই দিতে পারে)
// আর /result/[examId] (ফোন নাম্বার দিয়ে লুকআপ) ইচ্ছাকৃতভাবে বাদ দেওয়া হলো —
// এগুলো সময়-নির্ভর/ব্যক্তিগত কনটেন্ট, সার্চ ইঞ্জিনে ইনডেক্স হওয়ার দরকার নেই।
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/contact", "/exam", "/result", "/live"];

  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/exam" || route === "/live" ? "hourly" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
