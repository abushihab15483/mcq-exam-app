import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import NoticeList from "@/components/admin/NoticeList";
import { Button } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notice } from "@/types";

// প্রতিটা request এ fresh data — নাহলে নতুন/এডিট করা notice সাথে সাথে
// দেখাতো না (exams/messages list page এর একই pattern)
export const dynamic = "force-dynamic";

export default async function NoticesListPage() {
  const supabase = createAdminClient();
  // Admin panel এ draft/published/pinned/expired সব notice-ই দেখতে হবে
  // (public GET এর মতো filter না) — শুধু ব্যবস্থাপনার সুবিধার জন্য সবচেয়ে
  // নতুন তৈরি করা notice আগে দেখানো হচ্ছে
  const { data: notices, error } = await supabase
    .from("notices")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Notice[]>();

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">নোটিশ</h1>
        <Link href="/notices/new">
          <Button>নতুন নোটিশ তৈরি করো</Button>
        </Link>
      </div>
      {error ? (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-medium">তথ্য লোড করতে সমস্যা হয়েছে</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <p className="mt-2 text-sm text-ink-soft">
            এই টেবিল এখনো তৈরি না হয়ে থাকলে supabase/step18-notices.sql
            Supabase Dashboard এর SQL Editor এ Run করো।
          </p>
        </div>
      ) : (
        <NoticeList notices={notices ?? []} />
      )}
    </AdminShell>
  );
}
