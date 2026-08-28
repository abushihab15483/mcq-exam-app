// POST /api/attempts — student entry form সাবমিট হলে attempt তৈরি করে
// GET  /api/attempts?exam_id=... — admin panel এর student list এর জন্য
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentEntrySchema } from "@/lib/validators";
import { getExamWindowStatus, computeAttemptDeadline } from "@/lib/time";
import { getAdminSession } from "@/lib/api-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { issueExamSessionToken } from "@/lib/examSessionToken";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = studentEntrySchema.extend({
  exam_id: z.string().uuid("সঠিক exam id দরকার"),
});

// supabase/schema.sql এ `unique (exam_id, student_phone)` নাম না দিয়ে ডিফাইন করা,
// তাই Postgres নিজে থেকে এই standard নাম দেয় (<table>_<col1>_<col2>_key)। শুধু
// `code === "23505"` চেক করাই যথেষ্ট না — attempts টেবিলে ভবিষ্যতে অন্য কোনো
// unique constraint যোগ হলে সেটাও একই কোড দেবে, কিন্তু সেটা এই "already
// participated" resume-flow এর case না। তাই constraint name ধরে নিশ্চিত করা হয়।
const DUPLICATE_ATTEMPT_CONSTRAINT = "attempts_exam_id_student_phone_key";

function isDuplicateAttemptConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error || error.code !== "23505") return false;
  return typeof error.message === "string" && error.message.includes(DUPLICATE_ATTEMPT_CONSTRAINT);
}

// lost-response retry এর জন্য কতক্ষণ পর্যন্ত নাম hard-না-মিললেও phone দিয়েই
// resume করতে দেওয়া হবে — একই form-submit এর network retry বাস্তবে সেকেন্ড
// থেকে বড়জোর দুই এক মিনিটের মধ্যেই হয় (timeout/backoff), নাম হুবহু না মিললেও
// (autocorrect/mobile keyboard/সামান্য টাইপো) এই window এর ভিতরে student কে
// আটকে রাখা উচিত না। এর বাইরে (অনেক পরে ফিরে আসা, শেয়ার্ড ল্যাবে অন্য কেউ)
// নাম অবশ্যই মিলতে হবে — নাহলে শুধু ফোন নাম্বার জেনে অন্য কারো active
// attempt/token নিয়ে নেওয়া যেত, যেটা আটকানোর জন্যই নাম-চেক আছে।
const RETRY_GRACE_MS = 2 * 60_000; // ২ মিনিট

// আগে key ছিল `create-attempt:${ip}:${exam_id}` — শেয়ার্ড স্কুল/ল্যাব IP তে
// ৩০-৪০ জন student একই bucket শেয়ার করতো, ফলে কয়েকজন মিলে দুই-একবার retry
// করলেই বাকি সবার জন্য bucket exhaust হয়ে legit student রা 429 পেয়ে exam-ই
// শুরু করতে পারতো না (classroom false positive)। এখন student_phone দিয়ে
// key — প্রতিটা student এর নিজের bucket, এক IP-তে যত জনই থাকুক একে অপরের
// bucket ছোঁয় না। limit ছোট রাখা হয়েছে (৩০ থেকে ৬) কারণ পরিচয়টা এখন সত্যিই
// per-student — একজন student এর সাধারণ ব্যবহারে ৬ বারের বেশি লাগার কথা না
// (form submit + network retry/double-click; duplicate attempt এমনিতেই
// (exam_id, student_phone) unique constraint দিয়ে আটকানো, তাই বাকিটা শুধু
// abuse/enumeration protection)
const CREATE_ATTEMPT_LIMIT = 6;
const CREATE_ATTEMPT_WINDOW_MS = 10 * 60_000; // ১০ মিনিট

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  const { exam_id, student_name, student_phone, student_institution } = parsed.data;

  // student_phone zod স্কিমায় একটাই strict format (^01[3-9]\d{8}$, trimmed)
  // দিয়ে validate — +880/dash/space এর মতো formatting variation আসতেই পারে
  // না, তাই আলাদা normalize ধাপ লাগছে না; parsed.data.student_phone-ই
  // canonical। body validate হওয়ার পরই এই চেক (malformed request bucket
  // খরচ করে না)।
  const rl = await checkRateLimit(
    `create-attempt:${student_phone}:${exam_id}`,
    CREATE_ATTEMPT_LIMIT,
    CREATE_ATTEMPT_WINDOW_MS
  );
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, status, start_time, end_time, duration_minutes")
    .eq("id", exam_id)
    .single();

  if (examError || !exam) {
    return Response.json({ error: "পরীক্ষা পাওয়া যায়নি" }, { status: 404 });
  }

  const windowStatus = getExamWindowStatus(exam);
  if (windowStatus === "not_published") {
    return Response.json({ error: "এই পরীক্ষা এখনো প্রকাশিত হয়নি" }, { status: 403 });
  }
  if (windowStatus === "not_started") {
    return Response.json({ error: "পরীক্ষা এখনো শুরু হয়নি" }, { status: 403 });
  }
  if (windowStatus === "ended") {
    return Response.json({ error: "পরীক্ষার সময় শেষ হয়ে গেছে" }, { status: 403 });
  }

  const { data: attempt, error: insertError } = await supabase
    .from("attempts")
    .insert({ exam_id, student_name, student_phone, student_institution })
    .select("id, started_at")
    .single();

  if (insertError) {
    // unique(exam_id, student_phone) violation. This is NOT always a real
    // second attempt — it also fires when:
    //   (a) the INSERT above actually succeeded but the response was lost
    //       to a network timeout/drop before it reached the browser, and
    //       the student's form auto/manually retried, or
    //   (b) shared-lab-PC resume: same student, lost tab/localStorage.
    // Either way the correct move is the same: never insert a second row —
    // recover the existing attempt and hand back the SAME attempt_id/token
    // instead of dead-ending with an error. Mirrors the idempotency pattern
    // already used in /api/submit (check current DB state, don't just
    // trust/replay the failed call).
    if (isDuplicateAttemptConflict(insertError)) {
      const { data: existing, error: findError } = await supabase
        .from("attempts")
        .select("id, student_name, started_at, submitted_at")
        .eq("exam_id", exam_id)
        .eq("student_phone", student_phone)
        .maybeSingle();

      if (findError || !existing) {
        // The unique constraint fired, so a matching row must exist —
        // failing to read it back means something else is wrong (replica
        // lag, transient DB error, RLS). Don't fabricate an attempt_id or
        // silently fall through to a generic "already participated" — that
        // would strand a legitimate first-time student. Fail loudly and log.
        console.error("POST /api/attempts: 23505 conflict but existing row not found", {
          exam_id,
          findError,
        });
        return Response.json({ error: "শুরু করা যায়নি, আবার চেষ্টা করো" }, { status: 500 });
      }

      // নাম মিলিয়ে দেখা হচ্ছে (ResultLookup এ ব্যবহৃত একই identity check) — নতুন
      // কোনো auth system না, attempt তৈরির সময়কার একই phone+name ফর্ম-ডেটা reuse।
      const nameMatches =
        existing.student_name.trim().toLowerCase() === student_name.trim().toLowerCase();

      // Server এর নিজের ঘড়ি দিয়ে হিসাব — client clock trust করা হচ্ছে না, ঠিক
      // যেভাবে lib/time.ts এর deadline হিসাবেও করা হয়। attempt টা এইমাত্র (এই
      // window এর ভিতরে) তৈরি হলে সেটা almost certainly এই একই request এর lost-
      // response retry, নাম আলাদা কেউ হবে এমন সম্ভাবনা নেই — কেউ যদি phone
      // নাম্বার আগে থেকে জেনে হাইজ্যাক করতেই চায়, তাকে ঠিক ওই কয়েক মিনিটের
      // মধ্যেই আসল student এর submit মুহূর্তে হানা দিতে হবে, যেটা বাস্তবে সম্ভব না।
      const withinRetryGrace = Date.now() - new Date(existing.started_at).getTime() <= RETRY_GRACE_MS;
      const canRecover = nameMatches || withinRetryGrace;

      if (canRecover && !existing.submitted_at) {
        // একই student এর lost-response retry (বা শেয়ার্ড ল্যাবে resume) — নতুন
        // attempt তৈরি না করে ঠিক সেই একই attempt_id/token ফেরত দেওয়া হচ্ছে,
        // existing answers/progress (answers টেবিল, submitted_at) কিছুই ছোঁয়া হয়নি।
        // Token নতুন করে ইস্যু হচ্ছে — এই attempt এর নিজের effective deadline
        // থেকে হিসাব করে (দেখো নিচের মূল সাফল্যের path এর কমেন্ট), পুরনো কোনো
        // token আবার পাঠানো হচ্ছে না।
        const resumedDeadline = computeAttemptDeadline(
          existing.started_at,
          exam.duration_minutes,
          exam.end_time
        );
        return Response.json({
          attempt_id: existing.id,
          started_at: existing.started_at,
          duration_minutes: exam.duration_minutes,
          access_token: issueExamSessionToken(existing.id, resumedDeadline),
          resumed: true,
        });
      }

      if (canRecover && existing.submitted_at) {
        // ইতিমধ্যে জমা দেওয়া attempt আবার খোলা হচ্ছে না — existing behavior বজায় রাখা হলো
        return Response.json(
          { error: "তুমি ইতিমধ্যে এই পরীক্ষা জমা দিয়েছ, ফলাফল পেজে দেখো" },
          { status: 409 }
        );
      }

      // নাম না মিললে, আর grace window ও পার হয়ে গেছে — একই generic মেসেজ
      // (আক্রমণকারী কোন অংশটা ভুল ছিল বুঝতে না পারুক, /api/attempts/lookup এর মতোই)
      return Response.json({ error: "তুমি ইতিমধ্যে এই পরীক্ষায় অংশ নিয়েছ" }, { status: 409 });
    }

    // অপ্রাসঙ্গিক DB error (constraint অন্য কিছু, connection issue, ইত্যাদি) —
    // ভুল করে 409 এ রূপান্তর না করে, আসল 500 ফেরত দাও এবং log করো
    console.error("POST /api/attempts: insert failed", insertError);
    return Response.json({ error: "শুরু করা যায়নি, আবার চেষ্টা করো" }, { status: 500 });
  }

  // এই attempt_id এর "মালিকানা প্রমাণ" — শুধু attempt_id জানা (guess/leak হলেও)
  // আর যথেষ্ট না প্রশ্ন পড়ার/submit করার জন্য, এই signed exam-session token-ও
  // লাগবে। এর TTL blanket "৬ ঘণ্টা"/"duration + ১৫ মিনিট" কিছু না — এই
  // attempt এর নিজের effective deadline (MIN(start+duration, exam.end_time))
  // থেকেই হিসাব হয় (দেখো lib/examSessionToken.ts) — তাই ৭:৪০ এ শুরু করা কারো
  // token ৮টার একটু পরেই expire হবে, ৫টায় শুরু করা কারো ৫:৪০ এর একটু পরে।
  // এই token দিয়েই পরে result access token পাওয়া যাবে (submit success এ),
  // কিন্তু নিজে কখনো result access এর জন্য সরাসরি ব্যবহার হবে না।
  const effectiveDeadline = computeAttemptDeadline(
    attempt.started_at,
    exam.duration_minutes,
    exam.end_time
  );
  return Response.json({
    attempt_id: attempt.id,
    started_at: attempt.started_at,
    duration_minutes: exam.duration_minutes,
    access_token: issueExamSessionToken(attempt.id, effectiveDeadline),
  });
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const examId = new URL(request.url).searchParams.get("exam_id");
  if (!examId) return Response.json({ error: "exam_id দরকার" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attempts")
    // admin এর student list (StudentTable.tsx) শুধু এই কলামগুলাই দেখায় —
    // exam_id (route এ আগে থেকেই filter হিসেবে জানা) আর submitted_at
    // (UI তে অব্যবহৃত, score !== null দিয়েই "চলছে..." বোঝানো হয়) বাদ
    .select("id, student_name, student_phone, student_institution, score, total_questions, started_at")
    .eq("exam_id", examId)
    .order("started_at", { ascending: false });

  if (error) return Response.json({ error: "লোড করা যায়নি" }, { status: 500 });
  return Response.json({ attempts: data });
}
