// Notice attachment storage — bucket নাম, allowed type/size, আর path
// build/extract helper — attachment route আর notice CRUD route দুটোতেই লাগে,
// একই জায়গায় রাখা হলো যাতে দুই ফাইলে আলাদা constant থেকে drift না হয়।

export const NOTICE_ATTACHMENT_BUCKET = "notices";

// Vercel Serverless Function এর request body hard limit ৪.৫MB (413
// FUNCTION_PAYLOAD_TOO_LARGE) — এই app-এ attachment upload আমাদের নিজের
// /api/notices/[noticeId]/attachment route দিয়েই proxy হয় (client সরাসরি
// Supabase Storage এ যায় না, কারণ সেটার জন্য bucket এ anon-writable RLS
// policy লাগতো — admin-only security model ভেঙে যেতো)। তাই সেই ৪.৫MB এর
// নিচে নিরাপদ margin রেখে limit ৪MB এ বসানো হলো (FINAL PLAN এ বলা ৫-১০MB
// Vercel এ deploy করলে কাজ করবে না)।
export const NOTICE_ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024; // 4MB

export const NOTICE_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

// শুধু extension দিয়েও double-check — mime type client/browser থেকে spoof
// করা সহজ, extension+mime দুটো মিললে ভুল ফাইল upload হওয়ার সম্ভাবনা কমে
export const NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

// ফাইলের নাম থেকে path-এ বিপজ্জনক character (slash, space, বাংলা/ইউনিকোড
// ইত্যাদি) সরিয়ে একটা safe object key বানানো — নাহলে storage path এ সমস্যা
// করতে পারে বা অপ্রত্যাশিতভাবে nested folder তৈরি হয়ে যেতে পারে
function sanitizeFileName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  const base = lastDot === -1 ? trimmed : trimmed.slice(0, lastDot);
  const ext = lastDot === -1 ? "" : trimmed.slice(lastDot);
  const safeBase = base.replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").slice(0, 60) || "file";
  return `${safeBase}${ext}`;
}

// Sequencing (FINAL PLAN): notice আগে insert (id পাওয়া যায়) → তারপর এই path এ
// upload → তারপর PATCH/attachment route দিয়ে attachment_url বসানো
export function buildNoticeAttachmentPath(noticeId: string, fileName: string): string {
  return `${noticeId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

// Public URL থেকে bucket-relative object path বের করা — DELETE/replace এর
// সময় পুরনো ফাইল storage থেকে cleanup করতে লাগে
export function extractNoticeAttachmentPath(attachmentUrl: string): string | null {
  const marker = `/storage/v1/object/public/${NOTICE_ATTACHMENT_BUCKET}/`;
  const idx = attachmentUrl.indexOf(marker);
  if (idx === -1) return null;
  return attachmentUrl.slice(idx + marker.length);
}
