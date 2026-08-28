// GET /api/attempts/lookup?exam_id=...&phone=...&name=...
//
// Step 4 (security hardening) — আগে শুধু exam_id + phone দিয়ে result খোঁজা যেত।
// সমস্যা: ফোন নাম্বার একটা limited format এর সংখ্যা (01[3-9] + ৮ ডিজিট), আর
// এই endpoint এ কোনো rate limit ছিল না — তাই কেউ script দিয়ে ধারাবাহিকভাবে
// ফোন নাম্বার চেষ্টা করে গেলে একটা exam এর সব student এর নাম + score + school
// বের করে ফেলতে পারতো (attempt_id পেয়ে গেলে /api/attempts/[attemptId] থেকে সব
// তথ্য পাওয়া যায়)। এখন দুটো জিনিস যোগ করা হলো:
//
// ১. দ্বিতীয় factor — ফোন নাম্বারের পাশাপাশি ঠিক ওই নামটাও (exam শুরুর সময় যা
//    দিয়েছিল) দিতে হবে। এতে blind brute-force করে শুধু ফোন নাম্বার ঘুরিয়ে কারো
//    result বের করা যাবে না — আক্রমণকারীকে নামও জানতে হবে, যেটা automate করা
//    কঠিন। নতুন কোনো DB column লাগেনি, existing student_name-ই ব্যবহার হচ্ছে।
// ২. Rate limiting (Step 5) — IP + exam_id ভিত্তিতে প্রতি ১০ মিনিটে সর্বোচ্চ ২০টা
//    lookup (Postgres-backed, দেখো lib/rateLimit.ts)। বেশি হলে 429 (generic
//    message) — automated script বড় আকারে চালানো কঠিন হয়ে যায়, তবু শেয়ার্ড
//    কম্পিউটার ল্যাবের (এক IP তে অনেক student) স্বাভাবিক ব্যবহার সহ্য করে।
//
// Generic error: ফোন ভুল, নাম ভুল, বা কিছুই না মিললে — সবক্ষেত্রেই একই বার্তা
// (কোন অংশটা ভুল সেটা বলা হয় না), যাতে আক্রমণকারী ফোন নাম্বার আলাদা করে verify
// করতে না পারে (যে এই নাম্বারে কেউ পরীক্ষা দিয়েছে কিনা সেটাও গোপন থাকে)।
import { createAdminClient } from "@/lib/supabase/admin";
import { resultLookupSchema } from "@/lib/validators";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { issueResultAccessToken } from "@/lib/resultAccessToken";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const GENERIC_ERROR = "এই নাম ও ফোন নাম্বার দিয়ে কোনো ফলাফল পাওয়া যায়নি";
// শেয়ার্ড কম্পিউটার ল্যাবের (এক IP তে অনেক student) স্বাভাবিক ব্যবহার সহ্য
// করার মতো যথেষ্ট বড়, কিন্তু automated script দিয়ে বড় আকারে brute-force করার
// জন্য যথেষ্ট ছোট — বিশেষ করে যেহেতু এখন phone+name দুটোই মিলাতে হয় (Step 4)
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000; // ১০ মিনিট

export async function GET(request: Request) {
  const url = new URL(request.url);
  const examId = url.searchParams.get("exam_id");
  const phone = url.searchParams.get("phone");
  const name = url.searchParams.get("name");

  const parsed = resultLookupSchema.safeParse({
    exam_id: examId,
    student_phone: phone,
    student_name: name,
  });

  if (!parsed.success) {
    return Response.json({ error: "তথ্য সঠিক না — নাম ও ফোন নাম্বার দুটোই দাও" }, { status: 400 });
  }

  // Rate limit — IP + exam_id ভিত্তিতে (একটা exam এ spam করলে অন্য exam এর
  // lookup ব্লক হয়ে যাবে না)
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`lookup:${ip}:${parsed.data.exam_id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const { exam_id, student_phone, student_name } = parsed.data;

  const supabase = createAdminClient();
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, student_name, submitted_at")
    .eq("exam_id", exam_id)
    .eq("student_phone", student_phone)
    .single();

  // ফোন নাম্বার না মিললে, অথবা মিললেও নাম না মিললে — দুই ক্ষেত্রেই একই generic
  // error, যাতে আক্রমণকারী বুঝতে না পারে কোন অংশটা ভুল ছিল (phone না name)
  const nameMatches =
    !!attempt && attempt.student_name.trim().toLowerCase() === student_name.trim().toLowerCase();

  if (error || !attempt || !nameMatches) {
    return Response.json({ error: GENERIC_ERROR }, { status: 404 });
  }

  if (!attempt.submitted_at) {
    return Response.json({ error: "এই পরীক্ষা এখনো জমা দেওয়া হয়নি" }, { status: 409 });
  }

  // phone+name দুটোই মিলে গেছে (Step 4 verification সফল) — এখন এই attempt এর
  // জন্য একটা independent, short-lived result access token ইস্যু করা হচ্ছে
  // (exam-session token এর সাথে এর কোনো সম্পর্ক নেই — এই attempt exam
  // চলাকালীন যতদিন আগেই শেষ হয়ে গেছে না কেন, এই token কাজ করবে)। এখন থেকে
  // শুধু attempt_id দিয়ে /api/attempts/[attemptId] বা .../review কল করলে হবে
  // না, এই token-ও লাগবে — token পাওয়ার বৈধ পথ এই verification, আর expire
  // হয়ে গেলে ঠিক এই একই lookup আবার করলেই নতুন token পাওয়া যায়।
  return Response.json({ attempt_id: attempt.id, access_token: issueResultAccessToken(attempt.id) });
}
