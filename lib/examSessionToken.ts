// Exam-session credential — Issue #9 redesign, Part A.
//
// এই token শুধু exam চলাকালীন ব্যবহৃত হয়:
//   - প্রশ্ন fetch করা authorize করা (/api/exams/[examId]/questions)
//   - submission intent/ping authorize করা (/api/submit/intent)
//   - final submit authorize করা (/api/submit)
//
// এটা এর আগে lib/resultToken.ts এর issueResultToken()/verifyResultToken()
// দিয়ে করা হতো — কিন্তু সেই একই function দিয়ে result/review access ও করা হতো,
// আর দুইটার TTL এর দরকার সম্পূর্ণ আলাদা (result কে মাসখানেক পরেও কাজ করতে
// হবে, exam session কে না)। তাই আলাদা ফাইল/concept।
//
// *** Token expiry ≠ exam deadline ***
// এই token এর expiry শুধু "কতক্ষণ পর্যন্ত এই credential ধরে server কোনো
// request গ্রহণ করবে" তার সীমা — প্রকৃত ৮টার hard cutoff টা কখনোই এই token
// থেকে আসে না। প্রতিটা critical endpoint (questions/intent/submit) নিজে
// আলাদাভাবে DB এর নিজের ঘড়ি (clock_timestamp()) দিয়ে
// effective_deadline = MIN(started_at + duration, exam.end_time)
// আবার হিসাব/verify করে — client এই token এর ভিতরের কোনো মান বদলে দিলেও
// (বা browser clock পাল্টালেও) সেটা exam চালিয়ে যাওয়ার কোনো সুযোগ দেয় না,
// কারণ authoritative decision সবসময় সার্ভার/DB সাইডে, আলাদাভাবে নেওয়া হয়।
import { issueSignedToken, verifySignedToken } from "./tokenCrypto";

const KIND = "exam";

// effective_deadline এর উপরে শুধু transport/processing latency শোষণ করার
// জন্য যতটুকু দরকার — DB এর নিজস্ব finalization buffer (দেখো
// supabase/step16-hard-cutoff-and-answer-snapshot.sql, ২০ সেকেন্ড) এর চেয়ে
// একটু বড় রাখা হলো, যাতে token নিজে আগেভাগে expire হয়ে সেই DB-side buffer
// window টাকেই ব্যবহার করতে না দেয়। এই buffer কখনো deadline কে পিছিয়ে দেয় না,
// শুধু এই token কে সেই একই buffer window এর শেষ পর্যন্ত বৈধ রাখে।
const TOKEN_EXPIRY_LEAD_MS = 60_000; // ৬০ সেকেন্ড

// attempt এর নিজের effective deadline (epoch ms) থেকে token এর expiry বানায় —
// "duration + 15 minutes" এর মতো blanket কিছু ব্যবহার করা হচ্ছে না (দেখো master
// prompt সেকশন ৪) — near-window-end এ শুরু করা student এর token যেন
// unnecessarily বড় সময় ধরে valid না থাকে।
export function issueExamSessionToken(attemptId: string, effectiveDeadlineMs: number): string {
  const exp = effectiveDeadlineMs + TOKEN_EXPIRY_LEAD_MS;
  const payload = `${KIND}.${attemptId}.${exp}`;
  return issueSignedToken(payload);
}

export function verifyExamSessionToken(token: string | null | undefined, attemptId: string): boolean {
  const parts = verifySignedToken(token, 3);
  if (!parts) return false;
  const [kind, tokenAttemptId, expStr] = parts;

  if (kind !== KIND) return false;
  if (tokenAttemptId !== attemptId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  return true;
}
