/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14.2 এর Client Router Cache ডিফল্টভাবে dynamic পেজের RSC ডেটা ~৩০ সেকেন্ড
  // ক্যাশ করে রাখে — normal <Link> নেভিগেশনে hard reload ছাড়া নতুন এক্সাম/ফলাফল দেখায়
  // না (force-dynamic শুধু server-side data cache নিয়ন্ত্রণ করে, এটা আলাদা layer)।
  // dynamic: 0 দিয়ে এই client cache পুরোপুরি বন্ধ করা হলো — প্রতিটা নেভিগেশনে fresh data আসবে।
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
  // /public এর assets (MathJax vendor bundle ~1.8MB, coaching images, icons) ফাইল-নেম
  // অপরিবর্তিত থাকে — আপডেট করতে হলে ফাইলটাই নতুন নামে বসাতে হবে। ডিফল্টে Next.js এই
  // ফাইলগুলোর জন্য কোনো long-cache header পাঠায় না, তাই প্রতিবার ভিজিটে browser আবার
  // revalidate করে (অন্তত একটা 304 round-trip)। এক বছরের immutable cache দিলে দ্বিতীয়বার
  // পরীক্ষা দিতে আসা ছাত্র বা repeat visitor-দের জন্য এই ফাইলগুলো ডিস্ক থেকেই লোড হবে —
  // slow mobile data-তে এক্সাম পেজ (MathJax লাগে) খোলা অনেক দ্রুত হবে।
  async headers() {
    const immutable = {
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    };
    return [
      { source: "/vendor/:path*", headers: [immutable] },
      { source: "/images/:path*", headers: [immutable] },
      { source: "/icons/:path*", headers: [immutable] },
    ];
  },
};

module.exports = nextConfig;
