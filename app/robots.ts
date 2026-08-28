import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

// এই ফাইলটা Next.js নিজে থেকেই /robots.txt এ সার্ভ করবে (কোনো public/robots.txt
// দরকার নেই, বরং দুইটা থাকলে conflict হতে পারে)।
//
// /login, /dashboard, /exams, /results — এইগুলো অ্যাডমিন প্যানেলের রুট
// (app/(admin)/ এর ভেতরের পেজ, route group নাম URL এ যোগ হয় না)। middleware.ts
// এমনিতেই এগুলো লগইন ছাড়া দেখতে দেয় না, এখানে disallow করাটা শুধু crawl budget
// বাঁচানো আর নিশ্চিত করার জন্য যে ভুল করেও এগুলো crawl/index না হয়।
// /api/ ব্যাকএন্ড রুট, এগুলো ইনডেক্স করার কিছু নেই।
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/dashboard", "/exams", "/results", "/messages", "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
