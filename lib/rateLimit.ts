// Postgres-backed rate limiter — Step 5 (API abuse protection)
//
// এই অ্যাপ যদি serverless environment এ (Vercel এর মতো) deploy হয়, একেকটা
// request একেকটা আলাদা Node process/instance এ যেতে পারে। একটা in-memory Map
// দিয়ে count রাখলে প্রতিটা instance এর হিসাব আলাদা হয়ে যেত, ফলে limit real
// production এ কার্যত অনেক বেশি loose (bypass করা সহজ) হয়ে যেত — সেটা নিরাপদ
// না, তাই এখানে সেটা করা হয়নি।
//
// এর বদলে Supabase Postgres — যেটা এমনিতেই এই প্রজেক্টের existing dependency —
// কে single shared counter store হিসেবে ব্যবহার করা হচ্ছে। কোনো নতুন external
// service (Redis/Upstash ইত্যাদি) লাগেনি। atomic `increment_rate_limit()`
// Postgres function (দেখো supabase/step8-rate-limits.sql) দিয়ে concurrent
// request থেকেও সঠিক count নিশ্চিত করা হয় — একই row-level-lock নীতি যা Step 2
// তে attempt submission claim করার জন্য ব্যবহার হয়েছিল।
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// key: route + identifier (IP, attempt_id, ইত্যাদি) দিয়ে বানানো ইউনিক string
// limit: এই window এ সর্বোচ্চ কতবার allow
// windowMs: fixed window এর দৈর্ঘ্য (মিলিসেকেন্ডে)
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;

  const { data: count, error } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart,
  });

  if (error) {
    // DB এ সাময়িক সমস্যা (network blip ইত্যাদি) হলে student কে আটকে না রেখে
    // allow করে দেওয়াই নিরাপদ (fail-open) — নাহলে একটা infra glitch এ পুরো
    // exam flow (attempt শুরু/submit) আটকে যেতে পারতো, যেটা rate limiting এর
    // চেয়ে অনেক বড় সমস্যা exam চলাকালীন সময়ে
    console.error("rate limit check failed, failing open:", error);
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }

  const used = (count as number | null) ?? 0;
  const allowed = used <= limit;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((windowStart + windowMs - Date.now()) / 1000));

  // মাঝে মাঝে (~২% request এ) পুরনো bucket পরিষ্কার করে দেয় — আলাদা cron job
  // সেটআপ ছাড়াই rate_limits টেবিল অসীম বড় হতে থাকা আটকায়। fire-and-forget —
  // এই cleanup এর জন্য মূল request কে অপেক্ষা করানো হয় না
  if (Math.random() < 0.02) {
    void supabase.rpc("cleanup_rate_limits", { p_older_than: windowStart - windowMs * 10 });
  }

  return { allowed, remaining: Math.max(0, limit - used), retryAfterSeconds };
}

// Request থেকে best-effort client IP বের করে।
// ⚠️ গুরুত্বপূর্ণ: এটা x-forwarded-for হেডারের উপর নির্ভর করে, যেটা কোনো trusted
// reverse proxy (Vercel এর edge network, বা নিজের সার্ভারে nginx) ছাড়া deploy
// করলে client নিজেই স্পুফ করতে পারে। Vercel এ deploy করলে এই হেডার Vercel এর
// edge নিজে বসায় (client এর পাঠানো ভ্যালু override করে) — তাই বিশ্বাসযোগ্য।
// নিজের সার্ভারে (VPS ইত্যাদি) deploy করলে সামনে একটা reverse proxy (nginx/caddy)
// রাখতে হবে যেটা এই হেডার নিজে সেট করে, client কে সরাসরি না পৌঁছাতে দিয়ে —
// নাহলে rate limit header spoof করে bypass করা সম্ভব হবে।
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// 429 response বানানোর হেল্পার — সব জায়গায় একই ফরম্যাট + সঠিক Retry-After header
export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "একটু বেশি চেষ্টা হয়ে গেছে — কিছুক্ষণ পর আবার চেষ্টা করো" },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}
