// Supabase env var (NEXT_PUBLIC_SUPABASE_URL ইত্যাদি) মিসিং থাকলে আগে raw
// crash হতো ("supabaseUrl is required." — কোথায় কী ভুল বোঝা কঠিন)। এই হেল্পার
// এর বদলে পরিষ্কার, actionable বাংলা এরর দেয় — Vercel এ deploy করার পর env var
// বসাতে ভুলে গেলে (বা নতুন Preview/Branch deployment এ env var কপি না হলে)
// server log/console এ সমস্যাটা সরাসরি বোঝা যাবে।
//
// এখনো throw করেই — এই ভ্যারিয়েবলগুলো ছাড়া অ্যাপ আসলেই কাজ করতে পারবে না, তাই
// silently কিছু একটা দেখিয়ে দেওয়াটা ভুল হবে। app/error.tsx (route-level) আর
// app/global-error.tsx (root layout-level) ইতিমধ্যে এই throw ধরে ছাত্রদের
// সাধারণ বাংলা মেসেজ দেখায়, টেকনিক্যাল ডিটেইল শুধু server log এ যায়।
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env missing] ${name} সেট করা নেই। Vercel Dashboard \u2192 Settings \u2192 Environment Variables এ এটা বসাও (সব environment: Production/Preview/Development), অথবা local এ .env.local ফাইলে বসাও — তারপর redeploy করো।`
    );
  }
  return value;
}
