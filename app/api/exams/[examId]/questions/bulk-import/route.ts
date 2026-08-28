// POST /api/exams/[examId]/questions/bulk-import — admin only.
// CSV এর raw text body তে নেয়, প্রতিটা row validate করে, তারপর একে একে
// (sequential — order ঠিক রাখার জন্য, Promise.all না) সেই একই
// create_question_atomic() RPC কল করে যেটা single question form ব্যবহার
// করে (দেখো app/api/questions/route.ts POST) — এতে order_index এর atomic
// guarantee আর validation rule দুই জায়গাতেই এক থাকে, আলাদা কোনো bulk-insert
// path তৈরি করা হয়নি যেটা ভবিষ্যতে out-of-sync হয়ে যেতে পারে।
//
// সব row valid না হলে কিছুই insert হয় না (all-or-nothing) — নাহলে "২৫টার
// মধ্যে ২০টা ঢুকলো, ৫টা ঢুকলো না" এই অবস্থায় admin বুঝতে পারবে না কোনগুলো
// বাদ পড়লো আর duplicate insert এর ঝুঁকি থাকে যদি সে আবার পুরো ফাইল আপলোড করে।
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import { parseBulkQuestionsCsv } from "@/lib/csvQuestionImport";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// এক request এ সর্বোচ্চ এতগুলো প্রশ্ন — খুব বড় ফাইল ভুলে আপলোড হলে, বা কেউ
// ইচ্ছাকৃতভাবে বিশাল payload পাঠালে, single request এ শত শত sequential RPC
// call (আর প্রতিটা নিজের advisory lock নিয়ে) আটকানোর জন্য একটা reasonable সীমা
const MAX_ROWS = 300;

const bodySchema = z.object({
  csv: z.string().min(1, "CSV ফাইল খালি"),
});

export async function POST(request: Request, { params }: { params: { examId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  if (!z.string().uuid().safeParse(params.examId).success) {
    return Response.json({ error: "exam id সঠিক না" }, { status: 400 });
  }

  const json = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return Response.json({ error: parsedBody.error.issues[0]?.message ?? "CSV পাওয়া যায়নি" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // exam সত্যিই আছে কিনা আগে দেখে নেওয়া — নাহলে ভুল/মুছে ফেলা examId দিয়ে
  // FK violation থেকে অস্পষ্ট 500 error আসতো
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("id", params.examId)
    .single();
  if (examError || !exam) {
    return Response.json({ error: "পরীক্ষা পাওয়া যায়নি" }, { status: 404 });
  }

  const { rows, errors } = parseBulkQuestionsCsv(parsedBody.data.csv);

  if (errors.length > 0) {
    return Response.json(
      {
        error: `CSV তে ${errors.length}টা সারিতে সমস্যা পাওয়া গেছে — কিছুই import হয়নি। আগে এগুলো ঠিক করো।`,
        rowErrors: errors,
      },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return Response.json({ error: "CSV তে কোনো বৈধ প্রশ্ন পাওয়া যায়নি" }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return Response.json(
      { error: `একবারে সর্বোচ্চ ${MAX_ROWS}টা প্রশ্ন import করা যাবে (CSV তে আছে ${rows.length}টা)` },
      { status: 400 }
    );
  }

  // Sequential — CSV তে যেই ক্রমে row আছে, questions ঠিক সেই ক্রমেই
  // order_index পাবে (Promise.all করলে RPC call গুলো সমান্তরালে চলে
  // ফলে advisory lock এর কারণে DB তে সিরিয়ালাইজড হলেও কোনটা আগে lock
  // পাবে তার guarantee থাকে না — CSV এর ক্রম নষ্ট হয়ে যেতে পারতো)
  const inserted: string[] = [];
  for (const row of rows) {
    const { data, error } = await supabase
      .rpc("create_question_atomic", {
        p_exam_id: params.examId,
        p_question_text: row.question_text,
        p_option_a: row.option_a,
        p_option_b: row.option_b,
        p_option_c: row.option_c,
        p_option_d: row.option_d,
        p_correct_option: row.correct_option,
        p_explanation: row.explanation,
      })
      .single();

    if (error || !data) {
      // আংশিক insert হয়ে গেছে (এই row এর আগেরগুলো) — admin কে জানিয়ে দাও,
      // যাতে দুইবার import করে duplicate তৈরি না করে
      return Response.json(
        {
          error: `${inserted.length}টা প্রশ্ন insert হওয়ার পর সারি ${row.rowNumber} এ সমস্যা হয়েছে — বাকিগুলো import হয়নি। আবার আপলোড করার আগে exam এর প্রশ্ন তালিকা চেক করো (duplicate এড়াতে)।`,
        },
        { status: 500 }
      );
    }
    inserted.push((data as { id: string }).id);
  }

  return Response.json({ imported: inserted.length, question_ids: inserted });
}
