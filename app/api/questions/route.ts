// GET (admin, ?exam_id= দিয়ে full question list — correct_option সহ)
// POST/PUT/DELETE — admin only, question CRUD
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const questionSchema = z.object({
  exam_id: z.string().uuid(),
  question_text: z.string().trim().min(1, "প্রশ্ন লেখো"),
  option_a: z.string().trim().min(1, "Option A দাও"),
  option_b: z.string().trim().min(1, "Option B দাও"),
  option_c: z.string().trim().min(1, "Option C দাও"),
  option_d: z.string().trim().min(1, "Option D দাও"),
  correct_option: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const examId = new URL(request.url).searchParams.get("exam_id");
  if (!examId) return Response.json({ error: "exam_id দরকার" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("questions")
    // admin question list/edit UI (QuestionList.tsx, QuestionForm.tsx) শুধু
    // question_text/option_a-d/correct_option/explanation দেখায় বা এডিট করে,
    // আর id rowKey/edit-target হিসেবে লাগে — exam_id (route param থেকেই জানা),
    // order_index (শুধু .order() এর জন্য, select এ থাকা লাগে না), created_at
    // কোথাও ব্যবহৃত হয় না (handleFormSubmit এর Omit<Question, ...> টাইপ দেখো)
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation")
    .eq("exam_id", examId)
    .order("order_index", { ascending: true });

  if (error) return Response.json({ error: "প্রশ্ন লোড করা যায়নি" }, { status: 500 });
  return Response.json({ questions: data });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = questionSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  // COUNT(*)+1 read-then-insert race condition ছিল — দুইটা concurrent request
  // (double-click/দুই ট্যাব/network retry) একই COUNT পড়ে একই order_index
  // বেছে নিতে পারতো। এখন পুরো "next order_index হিসাব + insert" একটা single
  // Postgres function এর ভিতরে, exam-scoped advisory lock ধরে রেখে হয়
  // (দেখো supabase/step15-atomic-question-create.sql) — client কখনো
  // order_index পাঠায় না, DB নিজেই এটার একমাত্র উৎস।
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .rpc("create_question_atomic", {
      p_exam_id: parsed.data.exam_id,
      p_question_text: parsed.data.question_text,
      p_option_a: parsed.data.option_a,
      p_option_b: parsed.data.option_b,
      p_option_c: parsed.data.option_c,
      p_option_d: parsed.data.option_d,
      p_correct_option: parsed.data.correct_option,
      p_explanation: parsed.data.explanation ?? null,
    })
    .single();

  if (error) return Response.json({ error: "প্রশ্ন যোগ করা যায়নি" }, { status: 500 });
  return Response.json({ question: data });
}

const updateSchema = questionSchema.partial().extend({ id: z.string().uuid() });

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("questions").update(rest).eq("id", id).select().single();

  if (error) return Response.json({ error: "আপডেট করা যায়নি" }, { status: 500 });
  return Response.json({ question: data });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(json);
  if (!parsed.success) return Response.json({ error: "id দরকার" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("questions").delete().eq("id", parsed.data.id);

  if (error) return Response.json({ error: "মুছে ফেলা যায়নি" }, { status: 500 });
  return Response.json({ success: true });
}
