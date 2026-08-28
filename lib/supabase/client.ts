// Browser client — anon key, RLS enforced. Student side এ use হবে।
//
// গুরুত্বপূর্ণ: Next.js শুধু তখনই NEXT_PUBLIC_ env var ব্রাউজারের কোডে (build
// time এ) বসিয়ে দেয়, যখন সরাসরি লেখা থাকে process.env.NEXT_PUBLIC_XXX (নাম
// literal/hardcoded)। process.env[variableName] এর মতো ডাইনামিক অ্যাক্সেস
// ব্রাউজারে কখনো কাজ করে না (সবসময় undefined) — তাই এখানে requireEnv(name)
// ব্যবহার না করে সরাসরি লিখতে হচ্ছে।
import { createBrowserClient } from "@supabase/ssr";

function requireClientEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[env missing] ${name} সেট করা নেই। Vercel Dashboard → Settings → Environment Variables এ এটা বসাও (সব environment: Production/Preview/Development), অথবা local এ .env.local ফাইলে বসাও — তারপর redeploy করো।`
    );
  }
  return value;
}

export function createClient() {
  return createBrowserClient(
    requireClientEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireClientEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
