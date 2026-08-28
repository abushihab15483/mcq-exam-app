// Exam window checks (start/end/duration logic) — Step 6
import type { Exam } from "@/types";

export type ExamWindowStatus = "not_published" | "not_started" | "active" | "ended";

// exam এর status + start/end time দেখে বর্তমানে student ঢুকতে পারবে কিনা check করে
export function getExamWindowStatus(
  exam: Pick<Exam, "status" | "start_time" | "end_time">,
  now: Date = new Date()
): ExamWindowStatus {
  if (exam.status !== "published") return "not_published";
  const start = new Date(exam.start_time).getTime();
  const end = new Date(exam.end_time).getTime();
  const t = now.getTime();
  if (t < start) return "not_started";
  if (t > end) return "ended";
  return "active";
}

// attempt শুরু হওয়ার সময় + exam এর duration যোগ করে deadline (epoch ms) বের করে —
// কিন্তু exam এর global end_time এর আগে কখনো যেতে পারবে না। যেমন: exam শেষ হয়
// 10:00 AM এ, student শুরু করলো 9:50 AM এ, duration 60 মিনিট — তাহলে তার হিসেবি
// deadline হতো 10:50 AM, কিন্তু আসল (authoritative) deadline হবে 10:00 AM, কারণ
// exam এর global end_time এর পরে কেউ পরীক্ষা চালিয়ে যেতে পারবে না।
//
// actualDeadline = MIN(attempt.started_at + duration_minutes, exam.end_time)
//
// সব timestamp (started_at, end_time) Postgres থেকে timestamptz হিসেবে ISO string
// আকারে আসে (timezone offset/'Z' সহ) — তাই new Date(iso).getTime() সবসময় সঠিক UTC
// epoch দেয়, browser এর local timezone যাই হোক না কেন। কোথাও local Bangladesh time
// hardcode করা হয়নি — সব তুলনা absolute epoch ms এ হয়।
export function computeAttemptDeadline(
  startedAtISO: string,
  durationMinutes: number,
  examEndTimeISO?: string | null
): number {
  const attemptDeadline = new Date(startedAtISO).getTime() + durationMinutes * 60_000;
  if (!examEndTimeISO) return attemptDeadline; // end_time জানা না থাকলে পুরনো আচরণ (fallback)
  const examEnd = new Date(examEndTimeISO).getTime();
  return Math.min(attemptDeadline, examEnd);
}
