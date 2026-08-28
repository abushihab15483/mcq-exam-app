// Step 13/16 support — "আমি submit করার চেষ্টা করছি" ping, যেটা শুধু একটা
// timestamp evidence না, সাথে current answers এর একটা snapshot ও পাঠায়। এই
// snapshot ই সার্ভারে (deadline এর আগে হলে) freeze হয়ে থাকে — পরে technical
// finalization buffer window এ শুধু এই frozen snapshot ই ব্যবহার হয়, তখনকার
// নতুন কোনো payload না (দেখো supabase/step16-hard-cutoff-and-answer-snapshot.sql)।
//
// keepalive: true থাকায় pagehide/visibilitychange এর সময়ও (যেখানে normal
// fetch ব্রাউজার cancel করে দিতে পারে) request পাঠানো চেষ্টা টিকে থাকে।
import type { OptionKey } from "@/types";

// Step 17 — এখন এটা একটা Promise ফেরত দেয় (আগে fire-and-forget/void ছিল)।
// কারণ: caller (submitExam) আগে ping fire করেই সাথে সাথে আসল /api/submit
// পাঠিয়ে দিত — দুইটা request প্রায় একই সময়ে network এ যেত, কোনটা আগে server এ
// পৌঁছাবে তার guarantee ছিল না। request_submission আর submit_attempt দুই RPC
// ই attempt row-এ `for update` lock নেয়, তাই যেটা আগে server-এ পৌঁছে সেটাই
// আগে execute হয় — exact deadline মুহূর্তে যদি submit_attempt আগে পৌঁছে যেত
// (frozen snapshot তখনো set হয়নি), সেটা buffer সুবিধা ছাড়াই reject হয়ে যেতে
// পারতো, যদিও ping ঠিক একই মুহূর্তে/তার আগেই client থেকে পাঠানো হয়েছিল।
//
// এখন caller ping টা (bounded timeout সহ) await করে আসল submit পাঠানোর আগে —
// এতে স্বাভাবিক (online) অবস্থায় ping-এর request_submission call সবসময়
// submit_attempt call-এর আগেই server-এ পৌঁছায় ও শেষ হয়, race window বন্ধ হয়ে
// যায়। এই function নিজে কখনো reject করে না (network fail/error হলেও resolve
// করে) — ব্যর্থ হলে caller শুধু buffer সুবিধা পাবে না, মূল submit flow কখনো
// block/fail হবে না।
export function pingSubmitIntent(
  attemptId: string,
  accessToken: string,
  answers: Record<string, OptionKey>
): Promise<void> {
  try {
    const body = JSON.stringify({
      attempt_id: attemptId,
      token: accessToken,
      answers,
      client_submitted_at: new Date().toISOString(),
    });
    return fetch("/api/submit/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    })
      .then(() => undefined)
      .catch(() => {
        // silent — এই ping ব্যর্থ হলে শুধু technical buffer সুবিধা পাওয়া যাবে
        // না, আসল submit এর সাফল্য/ব্যর্থতা এর উপর নির্ভর করে না
      });
  } catch {
    // fetch/JSON.stringify থেকে synchronous throw হলেও (খুবই বিরল) exam UI
    // কখনো ভাঙবে না — resolved promise ফেরত দাও যাতে caller-এর await আটকে না থাকে
    return Promise.resolve();
  }
}

// pagehide/visibilitychange এর মতো জায়গায় ব্যবহারের জন্য — sendBeacon একটা
// আলাদা transport (fetch না), tab বন্ধ হয়ে যাওয়ার সময়ও ব্রাউজার এটা delivery
// করার চেষ্টা চালিয়ে যায় (guaranteed না, শুধু best-effort backup — Layer 6)।
// এটাই সবচেয়ে ঝুঁকিপূর্ণ মুহূর্ত (ট্যাব বন্ধ হচ্ছে) বলে এখানেও answers
// snapshot সহ পাঠানো হচ্ছে — নাহলে ঠিক এই মুহূর্তেই একমাত্র transport যেটা
// টিকে থাকে সেটাই কোনো snapshot ছাড়া যেত।
export function beaconSubmitIntent(
  attemptId: string,
  accessToken: string,
  answers: Record<string, OptionKey>
): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
    const body = JSON.stringify({
      attempt_id: attemptId,
      token: accessToken,
      answers,
      client_submitted_at: new Date().toISOString(),
    });
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/submit/intent", blob);
  } catch {
    // best-effort only
  }
}

// pagehide এর সময় শেষ চেষ্টা হিসেবে আসল submission (answers সহ) পাঠানোর জন্য —
// একই idempotent /api/submit endpoint, শুধু transport sendBeacon। সার্ভার এটা
// normal fetch submit এর মতোই deadline/idempotency check করে, তাই duplicate
// বা race এ কোনো সমস্যা নেই।
export function beaconSubmitFinal(
  attemptId: string,
  answers: Record<string, OptionKey>,
  accessToken: string
): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
    const body = JSON.stringify({ attempt_id: attemptId, answers, token: accessToken });
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/submit", blob);
  } catch {
    // best-effort only
  }
}
