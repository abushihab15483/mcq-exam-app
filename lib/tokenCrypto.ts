// Shared HMAC sign/verify primitive — Issue #9 redesign.
//
// আগে lib/resultToken.ts একাই এই sign/verify লজিক রাখতো, আর সেই একই token
// exam-session (submit/questions authorize করা) আর result/review access —
// দুই সম্পূর্ণ আলাদা জিনিসের জন্য reuse হতো। এখন এই দুইটা আলাদা concept
// (lib/examSessionToken.ts, lib/resultAccessToken.ts) — কিন্তু signing এর
// mechanism (HMAC-SHA256, timing-safe compare) একই, তাই সেটুকুই শুধু এখানে
// শেয়ার করা হচ্ছে। কোনো ব্যবসায়িক/deadline লজিক এখানে নেই।
import { createHmac, timingSafeEqual } from "crypto";

// আলাদা env var দেওয়া best practice, কিন্তু deploy ভেঙে না যায় তাই না থাকলে
// SUPABASE_SERVICE_ROLE_KEY কে fallback secret হিসেবে ব্যবহার করা হচ্ছে — সেটাও
// এমনিতেই server-only secret, client কে কখনো পাঠানো হয় না।
const SECRET = process.env.RESULT_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function assertSecret(): string {
  if (!SECRET) {
    // Secret ছাড়া token ইস্যু/verify করা মানে "সবাই সবার attempt/result নিয়ে
    // যা খুশি করতে পারবে" অবস্থায় ফেরত যাওয়া — চুপচাপ চলতে দেওয়ার চেয়ে জোরে
    // ফেল করাই নিরাপদ।
    throw new Error(
      "RESULT_TOKEN_SECRET (বা SUPABASE_SERVICE_ROLE_KEY) সেট করা নেই — session/result token কাজ করবে না"
    );
  }
  return SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", assertSecret()).update(payload).digest("hex");
}

// payload এর জন্য একটা নতুন signed token বানায় — payload এর ভেতরেই caller যা
// দরকার (attemptId, kind, exp) encode করে দেয়, এই ফাইল শুধু sign/verify করে।
export function issueSignedToken(payload: string): string {
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

// টোকেনটাকে payload + signature এ ভেঙে দেয়, signature ঠিক আছে কিনা verify
// করে। Payload এর ভেতরের অংশ (kind/attemptId/exp) match করা caller এর কাজ —
// এই ফাইল শুধু "কেউ এই payload বানিয়ে sign করেনি নাকি" সেটা বলে।
export function verifySignedToken(
  token: string | null | undefined,
  expectedParts: number
): string[] | null {
  if (!token) return null;
  const parts = token.split(".");
  // শেষ অংশটা সবসময় signature — বাকিগুলো payload এর অংশ
  if (parts.length !== expectedParts + 1) return null;

  const sig = parts[parts.length - 1];
  const payloadParts = parts.slice(0, expectedParts);
  const payload = payloadParts.join(".");

  let expectedSig: string;
  try {
    expectedSig = sign(payload);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  // দৈর্ঘ্য না মিললে timingSafeEqual নিজেই throw করে — তাই আগে length check
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return payloadParts;
}
