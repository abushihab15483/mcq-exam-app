// GET (single exam, public — student entry page ও ব্যবহার করে)
// PUT/DELETE (admin only)
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { examSchema } from "@/lib/validators";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET টা public/unauthenticated (student entry page examId জেনে/guess করে কল
// করতে পারে) — আগে কোনো rate limit ছিল না, script দিয়ে exam metadata বার বার
// scrape/enumerate করা যেতো। questions route এ যেই একই প্যাটার্ন (IP+examId
// key) এখানেও ব্যবহার করা হলো।
const EXAM_GET_LIMIT = 60;
const EXAM_GET_WINDOW_MS = 60_000; // ১ মিনিট

export async function GET(request: Request, { params }: { params: { examId: string } }) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`exam-detail:${ip}:${params.examId}`, EXAM_GET_LIMIT, EXAM_GET_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("exams").select("*").eq("id", params.examId).single();

  if (error || !data) return Response.json({ error: "পরীক্ষা পাওয়া যায়নি" }, { status: 404 });
  return Response.json({ exam: data });
}

export async function PUT(request: Request, { params }: { params: { examId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = examSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // draft/closed আপডেটে এই extra query চালানোর দরকার নেই — শুধু publish করার
  // সময়ই প্রশ্ন সংখ্যা যাচাই করা হচ্ছে
  if (parsed.data.status === "published") {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_id", params.examId);

    if (!count) {
      return Response.json(
        { error: "এই পরীক্ষায় এখনো কোনো প্রশ্ন যোগ করা হয়নি। প্রকাশ করার আগে অন্তত ১টি প্রশ্ন যোগ করো।" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("exams")
    .update(parsed.data)
    .eq("id", params.examId)
    .select()
    .single();

  if (error) return Response.json({ error: "আপডেট করা যায়নি" }, { status: 500 });

  // status "published"/"closed" এ বদলালে হোমপেজের countdown card/ব্যানার
  // সাথে সাথেই আপডেট হবে — ৩০ সেকেন্ড ISR window এর জন্য অপেক্ষা করতে হবে না
  revalidatePath("/");
  // admin panel এর exam list ও results list — এডিট/publish করার সাথে সাথেই
  // notun status/data দেখাতে হবে, নাহলে Router Cache পুরনো তালিকা দেখাচ্ছিল
  revalidatePath("/exams");
  revalidatePath("/results");
  // student-der public exam list (/exam) — publish/close korle এখানেও
  // notun exam সাথে সাথেই "চলমান"/"আসন্ন" এ দেখাতে হবে, আগে বাদ পড়েছিল
  revalidatePath("/exam");

  return Response.json({ exam: data });
}

export async function DELETE(_request: Request, { params }: { params: { examId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("exams").delete().eq("id", params.examId);

  if (error) return Response.json({ error: "মুছে ফেলা যায়নি" }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/exams");
  revalidatePath("/results");
  revalidatePath("/exam");

  return Response.json({ success: true });
}
