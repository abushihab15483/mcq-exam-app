// GET (list, admin only) / POST (create, admin only) — exam CRUD
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import { examSchema } from "@/lib/validators";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে
// আগের রেসপন্স ধরে না রাখে (নাহলে নতুন exam/question add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("exams").select("*").order("created_at", { ascending: false });

  if (error) return Response.json({ error: "exam লোড করা যায়নি" }, { status: 500 });
  return Response.json({ exams: data });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = examSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  // নতুন exam এ প্রশ্ন থাকা সম্ভবই না (প্রশ্ন যোগ করতে হলে আগে exam_id দরকার) —
  // তাই এই চেকে কোনো DB query লাগে না, সরাসরি reject
  if (parsed.data.status === "published") {
    return Response.json(
      { error: "নতুন পরীক্ষা সরাসরি প্রকাশ করা যায় না। আগে 'খসড়া' হিসেবে তৈরি করে প্রশ্ন যোগ করো, তারপর প্রকাশ করো।" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("exams").insert(parsed.data).select().single();

  if (error) return Response.json({ error: "পরীক্ষা তৈরি করা যায়নি" }, { status: 500 });

  // হোমপেজ (app/(public)/page.tsx) `revalidate = 30` দিয়ে ISR — এই cache
  // ৩০ সেকেন্ড পার না হওয়া পর্যন্ত নতুন exam দেখাত না। এখানে revalidatePath
  // call করায় create করার সাথে সাথেই cache purge হয়ে যাবে, পরের রিকোয়েস্টেই fresh data।
  revalidatePath("/");
  // admin panel এর exam list ও এই মুহূর্তেই notun exam দেখাতে হবে —
  // নাহলে client-side Router Cache এর কারণে নতুন তৈরি করা exam list এ
  // দেখাতে (Router Cache নিজে থেকে stale না হওয়া পর্যন্ত) দেরি হচ্ছিল
  revalidatePath("/exams");

  return Response.json({ exam: data });
}
