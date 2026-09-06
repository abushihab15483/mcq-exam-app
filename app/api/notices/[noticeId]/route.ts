// PATCH (update, admin only) / DELETE (admin only) — single notice
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import { noticeSchema } from "@/lib/validators";
import { NOTICE_ATTACHMENT_BUCKET, extractNoticeAttachmentPath } from "@/lib/noticeStorage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: Request, { params }: { params: { noticeId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  // noticeSchema-ই একমাত্র সত্যের উৎস — admin form (create) আর এই update route
  // দুটোই একই validation ব্যবহার করে, যাতে নিয়ম কখনো out-of-sync না হয়
  const parsed = noticeSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  const { title, content, category, attachment_url, status, is_pinned, publish_at, expires_at } =
    parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notices")
    .update({
      title,
      content: content || null,
      category,
      attachment_url: attachment_url || null,
      status,
      is_pinned,
      publish_at,
      expires_at: expires_at || null,
    })
    .eq("id", params.noticeId)
    .select()
    .single();

  if (error) return Response.json({ error: "নোটিশ আপডেট করা যায়নি" }, { status: 500 });

  revalidatePath("/");
  revalidatePath("/notice");

  return Response.json({ notice: data });
}

export async function DELETE(_request: Request, { params }: { params: { noticeId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // ডিলিটের আগে attachment_url টা লাগবে — না নিলে storage cleanup করার মতো
  // কোনো তথ্যই থাকবে না (delete এর response এ কখনো attachment_url আসে না)
  const { data: existing, error: fetchError } = await supabase
    .from("notices")
    .select("attachment_url")
    .eq("id", params.noticeId)
    .single();

  if (fetchError || !existing) {
    return Response.json({ error: "নোটিশ পাওয়া যায়নি" }, { status: 404 });
  }

  const { error } = await supabase.from("notices").delete().eq("id", params.noticeId);
  if (error) return Response.json({ error: "মুছে ফেলা যায়নি" }, { status: 500 });

  // Attachment থাকলে storage থেকেও মুছে ফেলা — এই cleanup fail করলেও notice
  // row ইতিমধ্যে মুছে গেছে, তাই এটা fail করলে শুধু log করা হচ্ছে, পুরো
  // request কে error হিসেবে ফেরত পাঠানো হচ্ছে না (orphan file, orphan row না)
  if (existing.attachment_url) {
    const path = extractNoticeAttachmentPath(existing.attachment_url);
    if (path) {
      const { error: storageError } = await supabase.storage
        .from(NOTICE_ATTACHMENT_BUCKET)
        .remove([path]);
      if (storageError) {
        console.error("[api/notices] attachment cleanup failed:", storageError);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/notice");

  return Response.json({ success: true });
}
