// GET (public, filtered — ticker/homepage/notice page ব্যবহার করে) / POST (create, admin only)
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/api-auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { noticeSchema } from "@/lib/validators";
import type { PublicNotice } from "@/types";

// প্রতিটা request এ fresh data লাগবে — কোনো ধরনের static/data cache যাতে আগের
// রেসপন্স ধরে না রাখে (নাহলে নতুন/edited notice add করলেও পুরনো ডেটা দেখাতে পারে)
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_NOTICE_COLUMNS =
  "id, title, content, category, attachment_url, is_pinned, publish_at, expires_at";

// GET টা public/unauthenticated (ticker প্রতি ৩০-৬০ সেকেন্ডে বার বার কল করবে,
// আর যে কেউ URL জানলেই কল করতে পারে) — exam-detail route এর মতোই একই
// IP-based rate limit এখানেও, যাতে script দিয়ে বার বার scrape না করা যায়।
const NOTICE_GET_LIMIT = 60;
const NOTICE_GET_WINDOW_MS = 60_000; // ১ মিনিট

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`notice-list:${ip}`, NOTICE_GET_LIMIT, NOTICE_GET_WINDOW_MS);
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  // Public list filter (FINAL PLAN অনুযায়ী): status='published' এবং
  // publish_at<=now() এবং (expires_at is null অথবা expires_at>now())।
  // order: pinned আগে, তারপর নতুন প্রকাশিত আগে।
  const { data, error } = await supabase
    .from("notices")
    .select(PUBLIC_NOTICE_COLUMNS)
    .eq("status", "published")
    .lte("publish_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false });

  if (error) return Response.json({ error: "নোটিশ লোড করা যায়নি" }, { status: 500 });
  return Response.json({ notices: (data ?? []) as PublicNotice[] });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = noticeSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "তথ্য সঠিক না" }, { status: 400 });
  }

  const { title, content, category, attachment_url, status, is_pinned, publish_at, expires_at } =
    parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notices")
    .insert({
      title,
      content: content || null,
      category,
      // Step 3 (storage) এ attachment আগে notice insert হওয়ার পর, id পাওয়ার
      // পরে upload হবে — তাই create এর সময় সাধারণত attachment_url খালিই থাকে।
      // কিন্তু client সরাসরি কোনো valid URL পাঠালে (edge case) সেটাও রাখা হলো।
      attachment_url: attachment_url || null,
      status,
      is_pinned,
      publish_at,
      expires_at: expires_at || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: "নোটিশ তৈরি করা যায়নি" }, { status: 500 });

  // Master rule অনুযায়ী প্রতি mutation এ এই দুই path revalidate (exams route
  // এর pattern) — নাহলে homepage/notice page এর cache stale notice দেখাত
  revalidatePath("/");
  revalidatePath("/notice");

  return Response.json({ notice: data });
}
