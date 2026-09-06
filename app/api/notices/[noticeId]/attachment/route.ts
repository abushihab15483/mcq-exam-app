// POST (attachment upload) / DELETE (attachment remove) — admin only
//
// Sequencing (FINAL PLAN, Step 3): admin form আগে POST /api/notices দিয়ে
// notice তৈরি করে (attachment_url null) → id পাওয়া যায় → এই route দিয়ে
// file upload হয় (path এ notice id লাগে বলে notice আগে থেকেই থাকতে হয়) →
// এই route নিজেই DB তে attachment_url বসিয়ে দেয় (আলাদা করে PATCH কল করা
// লাগে না)।
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import {
  NOTICE_ATTACHMENT_BUCKET,
  NOTICE_ATTACHMENT_MAX_BYTES,
  NOTICE_ATTACHMENT_ALLOWED_MIME_TYPES,
  NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS,
  buildNoticeAttachmentPath,
  extractNoticeAttachmentPath,
} from "@/lib/noticeStorage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasAllowedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request, { params }: { params: { noticeId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // notice টা আসলে আছে কিনা, আর আগে থেকে কোনো attachment থাকলে সেটা কী —
  // পুরনোটা replace করলে cleanup করতে হবে বলে
  const { data: existing, error: fetchError } = await supabase
    .from("notices")
    .select("attachment_url")
    .eq("id", params.noticeId)
    .single();

  if (fetchError || !existing) {
    return Response.json({ error: "নোটিশ পাওয়া যায়নি — আগে নোটিশ তৈরি করো" }, { status: 404 });
  }

  // multipart/form-data — "file" field আশা করা হচ্ছে (admin form থেকে)
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "ফাইল পাওয়া যায়নি" }, { status: 400 });
  }

  // mime type + extension দুটোই মিলিয়ে check — mime type শুধু browser যা
  // পাঠায় তাই, সহজেই spoof করা যায়, তাই extension ও দেখা হচ্ছে (defense in
  // depth; bucket এর allowed_mime_types (step19 SQL) হলো শেষ safety net)
  const mimeOk = (NOTICE_ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  if (!mimeOk || !hasAllowedExtension(file.name)) {
    return Response.json(
      { error: "শুধু PDF, JPG, অথবা PNG ফাইল আপলোড করা যাবে" },
      { status: 400 }
    );
  }

  if (file.size > NOTICE_ATTACHMENT_MAX_BYTES) {
    return Response.json(
      { error: "ফাইলের সাইজ ৪MB এর বেশি হতে পারবে না" },
      { status: 400 }
    );
  }

  const path = buildNoticeAttachmentPath(params.noticeId, file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(NOTICE_ATTACHMENT_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[api/notices/attachment] upload failed:", uploadError);
    return Response.json({ error: "ফাইল আপলোড করা যায়নি" }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(NOTICE_ATTACHMENT_BUCKET).getPublicUrl(path);
  const attachmentUrl = publicUrlData.publicUrl;

  const { data: updated, error: updateError } = await supabase
    .from("notices")
    .update({ attachment_url: attachmentUrl })
    .eq("id", params.noticeId)
    .select()
    .single();

  if (updateError) {
    // DB update fail করলে just-uploaded file orphan হয়ে যাবে — সেটা cleanup
    // করার চেষ্টা করা হচ্ছে (best-effort, fail করলেও মূল error-ই ফেরত যাবে)
    await supabase.storage.from(NOTICE_ATTACHMENT_BUCKET).remove([path]);
    return Response.json({ error: "নোটিশে অ্যাটাচমেন্ট বসানো যায়নি" }, { status: 500 });
  }

  // Replace হলে (edit এ আগের attachment ছিল) পুরনো ফাইল storage থেকে মুছে
  // ফেলা — নাহলে orphan file জমতে থাকবে। এটা fail করলেও নতুন attachment
  // ইতিমধ্যে সেভ হয়ে গেছে, তাই request কে error হিসেবে ফেরত পাঠানো হচ্ছে না।
  if (existing.attachment_url) {
    const oldPath = extractNoticeAttachmentPath(existing.attachment_url);
    if (oldPath) {
      const { error: cleanupError } = await supabase.storage
        .from(NOTICE_ATTACHMENT_BUCKET)
        .remove([oldPath]);
      if (cleanupError) {
        console.error("[api/notices/attachment] old file cleanup failed:", cleanupError);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/notice");

  return Response.json({ notice: updated });
}

// শুধু attachment সরানো (পুরো notice মোছা না) — admin form এ "attachment
// বাদ দাও" বাটনের জন্য লাগবে
export async function DELETE(_request: Request, { params }: { params: { noticeId: string } }) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("notices")
    .select("attachment_url")
    .eq("id", params.noticeId)
    .single();

  if (fetchError || !existing) {
    return Response.json({ error: "নোটিশ পাওয়া যায়নি" }, { status: 404 });
  }

  if (!existing.attachment_url) {
    return Response.json({ error: "কোনো অ্যাটাচমেন্ট নেই" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("notices")
    .update({ attachment_url: null })
    .eq("id", params.noticeId)
    .select()
    .single();

  if (updateError) return Response.json({ error: "অ্যাটাচমেন্ট বাদ দেওয়া যায়নি" }, { status: 500 });

  const path = extractNoticeAttachmentPath(existing.attachment_url);
  if (path) {
    const { error: storageError } = await supabase.storage
      .from(NOTICE_ATTACHMENT_BUCKET)
      .remove([path]);
    if (storageError) {
      console.error("[api/notices/attachment] delete cleanup failed:", storageError);
    }
  }

  revalidatePath("/");
  revalidatePath("/notice");

  return Response.json({ notice: updated });
}
