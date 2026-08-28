// Result/review access credential — Issue #9 redesign, Part B.
//
// সমস্যা যেটা fix হচ্ছে (Issue #9, TTL mismatch): আগে একই resultToken.ts
// exam-session (submit authorize) আর result/review access — দুটোর জন্যই
// ব্যবহার হতো, একটা blanket ৬-ঘণ্টা TTL দিয়ে। এতে দুইটা ভুল একসাথে হতো:
//   ১. exam-session হিসেবে এই token অনেক ক্ষেত্রেই দরকারের চেয়ে বেশি সময়
//      বাঁচতো (attempt এর নিজের effective_deadline এর সাথে কোনো সম্পর্ক ছিল
//      না), আর
//   ২. completed result এর দীর্ঘমেয়াদী প্রাপ্যতা (আজ/কাল/এক মাস পরে) একটা
//      সংক্ষিপ্ত, hardcoded টোকেন TTL এর উপর নির্ভরশীল হয়ে যেত — টোকেন
//      expire হয়ে গেলে student এর মনে হতো তার ফলাফলই হারিয়ে গেছে।
//
// এই ফাইল শুধু (২) সমাধান করে: result/review access কে exam-session থেকে
// সম্পূর্ণ স্বাধীন করে। এই token ছোট মেয়াদী হলেও কোনো সমস্যা নেই, কারণ
// completed result এর প্রকৃত প্রাপ্যতা (business rule) কখনোই এই token এর
// উপর নির্ভর করে না — সেটা শুধু নির্ভর করে:
//   attempt DB তে আছে + exam DB তে আছে + attempt submitted হয়ে গেছে
// (দেখো app/api/attempts/[attemptId]/route.ts, .../review/route.ts)।
// Token expire হয়ে গেলে student শুধু আবার phone+name দিয়ে lookup করবে
// (app/api/attempts/lookup/route.ts) — সেটা নতুন করে এই token ইস্যু করে
// দেবে, ফলাফল কখনো "হারিয়ে যায় না"।
import { issueSignedToken, verifySignedToken } from "./tokenCrypto";

const KIND = "result";

// এটা exam-এর effective_deadline এর সাথে সম্পূর্ণ unrelated — এটা শুধু "একটা
// সাধারণ ব্রাউজিং সেশনে (স্কোর দেখা, review টগল করা, leaderboard স্ক্রল করা,
// রিফ্রেশ করা) কতক্ষণ ধরে বারবার phone+name না দিয়েই কাজ চলবে" তার একটা
// সুবিধাজনক সময়সীমা। Expire হয়ে গেলে student কে হারানো ফলাফল ফেরত পেতে
// লগইন/পাসওয়ার্ড কিছু লাগে না — শুধু আবার lookup ফর্ম, যেটা যেকোনো সময়
// (আজ/কাল/এক মাস পরে) নতুন token ইস্যু করে দেবে।
const DEFAULT_TTL_SECONDS = 2 * 60 * 60; // ২ ঘণ্টা
const TTL_SECONDS = Number(process.env.RESULT_ACCESS_TOKEN_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

export function issueResultAccessToken(attemptId: string): string {
  const exp = Date.now() + TTL_SECONDS * 1000;
  const payload = `${KIND}.${attemptId}.${exp}`;
  return issueSignedToken(payload);
}

export function verifyResultAccessToken(token: string | null | undefined, attemptId: string): boolean {
  const parts = verifySignedToken(token, 3);
  if (!parts) return false;
  const [kind, tokenAttemptId, expStr] = parts;

  if (kind !== KIND) return false;
  if (tokenAttemptId !== attemptId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  return true;
}
