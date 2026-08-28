// POST /api/contact
//
// আগে ContactForm.tsx এর কোনো backend ছিল না — এই route এখন সত্যিকারের সেভ করে,
// admin (public)/messages পেজ থেকে পড়া যায়। lookup route এর মতোই একই প্যাটার্নে
// (zod validate + Postgres-backed rate limit) বানানো হয়েছে যাতে বাকি কোডবেজের
// সাথে সামঞ্জস্যপূর্ণ থাকে।
import { createAdminClient } from "@/lib/supabase/admin";
import { contactMessageSchema } from "@/lib/validators";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// একজন মানুষ স্বাভাবিকভাবে একদিনে কয়েকবারের বেশি মেসেজ পাঠাবে না — এই limit
// শুধু spam/script bot ঠেকানোর জন্য, সাধারণ ব্যবহারকারী কখনো এতে আটকাবে না।
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000; // ১০ মিনিটে সর্বোচ্চ ৫টা

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "সঠিক তথ্য পাঠাও" }, { status: 400 });
  }

  const parsed = contactMessageSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "তথ্য সঠিক না";
    return Response.json({ error: firstError }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(`contact:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const { full_name, phone, email, subject, message } = parsed.data;

  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_messages").insert({
    full_name,
    phone,
    email: email || null,
    subject: subject || null,
    message,
  });

  if (error) {
    console.error("[api/contact] insert failed:", error);
    return Response.json(
      { error: "মেসেজ পাঠাতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করো" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
