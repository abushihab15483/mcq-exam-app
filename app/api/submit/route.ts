// POST /api/submit — একটা atomic Postgres RPC (submit_attempt, দেখো
// supabase/step16-hard-cutoff-and-answer-snapshot.sql) দিয়ে deadline check +
// answers write + score গণনা + attempt claim — সব একটা transaction এ করে।
// score client থেকে আসে না, app-server থেকেও আসে না — RPC নিজেই DB-এর
// correct_option দিয়ে গণনা করে (দেখো ওই SQL ফাইলের কমেন্ট)।
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { verifyExamSessionToken } from "@/lib/examSessionToken";
import { issueResultAccessToken } from "@/lib/resultAccessToken";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
  // attempt তৈরির সময় ইস্যু হওয়া exam-session credential — শুধু attempt_id
  // জানা (guess/leak) যথেষ্ট না, এই token ছাড়া submit করা যাবে না। এই token
  // এর expiry attempt এর নিজের effective deadline এর সাথে বাঁধা (দেখো
  // lib/examSessionToken.ts) — কিন্তু তার মানে "টোকেন বৈধ = submit করা
  // যাবে" না; নিচের RPC আলাদাভাবে DB এর নিজের ঘড়ি দিয়ে deadline verify করে।
  token: z.string().min(1, "token দরকার"),
});

// জিরো গ্রেস পিরিয়ড — কোনো SUBMIT_GRACE_SECONDS বা সমতুল্য কিছু নেই।
// authoritative deadline = MIN(attempt.started_at + duration_minutes,
// exam.end_time), RPC-এর ভিতরে DB-এর নিজের ঘড়ি (clock_timestamp()) দিয়ে
// enforce হয় — client clock/timer/deadline/`late` flag কখনো trust করা হয় না।
// 10:00:00 এর ১ সেকেন্ড আগে পর্যন্ত allowed, 10:00:00 এ/তার পরে reject
// (ছাড়া শুধু frozen pre-deadline snapshot দিয়ে বাউন্ডেড technical buffer, দেখো
// step16 SQL এর কমেন্ট)।

// attempt_id দিয়ে key করা হচ্ছে (IP দিয়ে না) — কারণ একই কম্পিউটার ল্যাবের (এক IP)
// অনেক student একসাথে exam শেষ করে জমা দিতে পারে, IP-ভিত্তিক limit করলে তাদের
// একজনের কারণে বাকিদের block হয়ে যেতে পারত। attempt_id প্রতি student এর জন্য
// আলাদা, তাই এটাই সঠিক scope — এই limit শুধু client-side dedup + server-side
// atomic claim ব্যর্থ হলে (buggy/malicious client loop) একটা শেষ safety net
// হিসেবে কাজ করে, স্বাভাবিক retry (নেটওয়ার্ক সমস্যায়) এ বাধা দেয় না
const SUBMIT_LIMIT = 10;
const SUBMIT_WINDOW_MS = 2 * 60_000; // ২ মিনিট

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "তথ্য সঠিক না" }, { status: 400 });
  }

  // attempt_id একা proof না — এই attempt শুরু করার সময় ইস্যু হওয়া exam-session
  // token ছাড়া কেউ submit করতে পারবে না (guess/leak হওয়া attempt_id দিয়ে
  // অন্য কারো হয়ে submit করা ঠেকাতে)।
  if (!verifyExamSessionToken(parsed.data.token, parsed.data.attempt_id)) {
    return Response.json({ error: "অনুমোদিত না" }, { status: 401 });
  }

  const rl = await checkRateLimit(`submit:${parsed.data.attempt_id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const { attempt_id, answers } = parsed.data;
  const supabase = createAdminClient();

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, exam_id, submitted_at")
    .eq("id", attempt_id)
    .single();

  if (attemptError || !attempt) {
    return Response.json({ error: "attempt পাওয়া যায়নি" }, { status: 404 });
  }

  // Fast-path: এই request আসার আগেই সাবমিট হয়ে গেছে — RPC কল না করেই idempotent
  // success ফেরত দাও (reload/duplicate call এ সমস্যা নেই)। এখানে result access
  // token ইস্যু হচ্ছে — exam-session token না, কারণ exam অংশ শেষ, এখন থেকে
  // student শুধু result/review দেখবে। এই request পাঠানো ডিভাইসটাই বৈধ
  // exam-session token জানত (উপরেই verify হয়েছে), তাই ওটাকে result দেখার
  // token দেওয়া নিরাপদ।
  if (attempt.submitted_at) {
    return Response.json({
      success: true,
      already_submitted: true,
      access_token: issueResultAccessToken(attempt_id),
    });
  }

  const answerRows = Object.entries(answers).map(([question_id, selected_option]) => ({
    question_id,
    selected_option,
  }));

  // এখানে শুধু attempt_id আর student এর উত্তরগুলোই পাঠানো হচ্ছে — কোনো score,
  // total, বা correct answer এখানে নেই। RPC নিজে DB থেকে correct_option ফেচ
  // করে score গণনা করে, একই transaction-এ যেটাতে answers write হয়। ৮টার হার্ড
  // কাটঅফ পার হয়ে থাকলে RPC নিজেই এই p_answers ignore করে শুধু আগে freeze
  // করা snapshot ব্যবহার করবে (দেখো step16 SQL) — এখানে আলাদা কোনো check
  // লাগছে না, RPC-ই একমাত্র authority।
  const { data: rpcResult, error: rpcError } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attempt_id,
    p_answers: answerRows,
  });

  if (rpcError || !rpcResult) {
    console.error("submit_attempt RPC failed:", rpcError);
    return Response.json({ error: "জমা দেওয়া যায়নি, আবার চেষ্টা করো" }, { status: 500 });
  }

  const status = (rpcResult as { status: string }).status;

  if (status === "not_found") {
    return Response.json({ error: "attempt পাওয়া যায়নি" }, { status: 404 });
  }

  if (status === "already_submitted") {
    // কেউ এর মধ্যেই জিতে গেছে (concurrent submit, বা network retry) — idempotent success
    return Response.json({
      success: true,
      already_submitted: true,
      access_token: issueResultAccessToken(attempt_id),
    });
  }

  if (status === "deadline_passed") {
    // authoritative deadline পার হয়ে গেছে (কোনো frozen pre-deadline snapshot
    // ছিল না, অথবা buffer window ও পার হয়ে গেছে) — সত্যিকারের reject, কোনো
    // score/answers DB তে লেখা হয়নি (RPC এর ভিতরেই block হয়েছে)। এটা terminal —
    // client কে এই একই attempt আবার retry করতে বলা অর্থহীন, deadline পিছনে যাবে না।
    return Response.json(
      { error: "পরীক্ষার সময় শেষ হয়ে গেছে, উত্তর জমা নেওয়া গেল না" },
      { status: 403 }
    );
  }

  if (status === "exam_closed") {
    // Step 14 — admin exam status published থেকে সরিয়ে দিয়েছে (closed/
    // archived) — attempt এর নিজের deadline তখনো ভবিষ্যতে থাকলেও কোনো নতুন
    // submission finalize হয় না (RPC নিজেই ইতিমধ্যে fetch করা v_exam row থেকে
    // চেক করেছে, এখানে আলাদা কোনো query হয়নি)। এটাও terminal — retry তে লাভ
    // নেই, exam আবার published হয়ে যাবে না।
    return Response.json(
      { error: "পরীক্ষা admin বন্ধ করে দিয়েছে, নতুন উত্তর জমা নেওয়া যাচ্ছে না" },
      { status: 403 }
    );
  }

  // status === "success" — score client কে সরাসরি ফেরত দেওয়া হচ্ছে না — result
  // page আলাদাভাবে exam শেষ হওয়ার পর /api/attempts/[attemptId] দিয়ে result দেখাবে।
  // এখানে ইস্যু হওয়া token একটা নতুন, independent result access credential —
  // exam-session token এর সাথে এর আর কোনো সম্পর্ক নেই, exam এর deadline যাই
  // হোক না কেন এই token আজ/কাল/মাসখানেক ধরে result/review দেখাতে ব্যবহার
  // করা যাবে (expire হলেও phone+name দিয়ে lookup করলে নতুন করে পাওয়া যায়)।
  const submittedAt = (rpcResult as { submitted_at?: string }).submitted_at;
  return Response.json({
    success: true,
    submitted_at: submittedAt,
    access_token: issueResultAccessToken(attempt_id),
  });
}
