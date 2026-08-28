// POST /api/submit/intent — Step 13/16 এর ধাপ ১: ছোট/দ্রুত "আমি submit করার
// চেষ্টা করছি" ping, এখন current answers এর snapshot সহ। কোনো score/final
// answers এখানে লেখে না — শুধু request_submission() RPC কল করে যাতে DB নিজের
// ঘড়ি দিয়ে attempts.submission_requested_at রেকর্ড করে, আর deadline এর আগে
// হলে attempts.frozen_answers এ এই মুহূর্তের answers freeze করে। এই
// server-recorded snapshot-ই পরে /api/submit কে (যদি সেটার বড় answers
// payload নেটওয়ার্ক delay-তে deadline এর একটু পরে পৌঁছায়) একটা bounded
// technical buffer এর ভিতরে — শুধু এই frozen snapshot দিয়েই — finalize
// করার সুযোগ দেয় (দেখো supabase/step16-hard-cutoff-and-answer-snapshot.sql)।
//
// এই endpoint নিজে কখনো authoritative না — এটা ব্যর্থ হলেও (network glitch,
// rate limit, ইত্যাদি) মূল /api/submit call independently deadline check করে,
// শুধু buffer window টা কাজে লাগবে না। তাই frontend এই call কে fire-and-forget
// হিসেবে পাঠায়, ব্যর্থতা কখনো submit flow block করে না।
//
// sendBeacon দিয়েও কল হতে পারে (pagehide এর সময়) — তাই body content-type
// নিয়ে strict না থেকে raw text parse করা হচ্ছে।
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { verifyExamSessionToken } from "@/lib/examSessionToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  attempt_id: z.string().uuid(),
  // exam চলাকালীন ব্যবহৃত short-lived session credential — শুধু attempt_id
  // জানা (guess/leak) যথেষ্ট না, ping দিয়ে answers freeze করাতে বা deadline
  // এর evidence রেকর্ড করাতেও এই token লাগবে।
  token: z.string().min(1, "token দরকার"),
  // এই মুহূর্তের answers এর snapshot — deadline এর আগে RPC এটাকে freeze করে
  // রাখে (frozen_answers), deadline পার হয়ে গেলে কিছুই লেখা হয় না। optional
  // রাখা হয়েছে যাতে পুরনো ক্লায়েন্ট/legacy call এও ping ভেঙে না পড়ে —
  // answers ছাড়া শুধু intent timestamp evidence হিসেবে কাজ করবে (buffer এর
  // জন্য যথেষ্ট না, কিন্তু ping নিজে fail করবে না)।
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])).optional(),
  // Layer 7: শুধু audit evidence হিসেবে পাঠানো হয়, deadline/buffer সিদ্ধান্তে
  // কখনো ব্যবহার হয় না (RPC নিজেই এটা শুধু client_submit_intent_at কলামে
  // log করে, কোনো authority হিসেবে না — দেখো step16 SQL)।
  client_submitted_at: z.string().datetime().optional(),
});

// /api/submit এর মতোই attempt_id দিয়ে key করা — শেয়ার্ড ল্যাবে এক IP থেকে
// অনেক student একসাথে ping পাঠাতে পারে, তাই IP-ভিত্তিক limit না।
const INTENT_LIMIT = 20;
const INTENT_WINDOW_MS = 2 * 60_000; // ২ মিনিট — manual click + auto-submit +
// retry + pagehide beacon সবগুলো মিলিয়ে এই window এ যথেষ্ট, কিন্তু script
// দিয়ে বারবার কল করে ping-এর মাধ্যমে deadline আগেভাগে "রিজার্ভ" করার চেষ্টা
// আটকানোর জন্যও যথেষ্ট ছোট।

export async function POST(request: Request) {
  // sendBeacon Blob body normal fetch body এর মতোই request.json() দিয়ে parse
  // হয় (Content-Type নিয়ে strict না) — তাই আলাদা কোনো parsing দরকার নেই।
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    // ping ব্যর্থ হলেও caller silently ignore করে — কোনো ভারী error response দরকার নেই
    return Response.json({ error: "তথ্য সঠিক না" }, { status: 400 });
  }

  // attempt_id একা proof না — exam-session token ছাড়া কেউ snapshot
  // freeze করাতে বা intent রেকর্ড করাতে পারবে না।
  if (!verifyExamSessionToken(parsed.data.token, parsed.data.attempt_id)) {
    return Response.json({ error: "অনুমোদিত না" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    `submit-intent:${parsed.data.attempt_id}`,
    INTENT_LIMIT,
    INTENT_WINDOW_MS
  );
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();

  const answerRows = parsed.data.answers
    ? Object.entries(parsed.data.answers).map(([question_id, selected_option]) => ({
        question_id,
        selected_option,
      }))
    : null;

  const { data: rpcResult, error: rpcError } = await supabase.rpc("request_submission", {
    p_attempt_id: parsed.data.attempt_id,
    p_answers: answerRows,
    p_client_submitted_at: parsed.data.client_submitted_at ?? null,
  });

  if (rpcError || !rpcResult) {
    console.error("request_submission RPC failed:", rpcError);
    // 500 দিলেও caller (fire-and-forget) কিছু করবে না — মূল /api/submit এর
    // deadline check এই ping এর সাফল্যের উপর নির্ভর করে না, শুধু buffer সুবিধা
    // পাওয়া যাবে না।
    return Response.json({ error: "ping ব্যর্থ" }, { status: 500 });
  }

  return Response.json(rpcResult);
}
