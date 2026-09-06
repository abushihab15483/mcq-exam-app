import AdminShell from "@/components/admin/AdminShell";
import NewNoticeForm from "@/components/admin/NewNoticeForm";
import { createAdminClient } from "@/lib/supabase/admin";

// প্রতিটা request এ fresh pinned count লাগবে (soft warning এর জন্য) — exams/messages
// list page এর একই force-dynamic pattern
export const dynamic = "force-dynamic";

// FINAL PLAN Step 7 — soft pin warning: এখানে শুধু count আনা হচ্ছে (head:true মানে
// আসল row ডেটা না, শুধু সংখ্যা — হালকা query), আসল ফর্ম লজিক NewNoticeForm এ (client)
export default async function NewNoticePage() {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("notices")
    .select("id", { count: "exact", head: true })
    .eq("is_pinned", true);

  return (
    <AdminShell>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">নতুন নোটিশ তৈরি করো</h1>
      <NewNoticeForm existingPinnedCount={count ?? 0} />
    </AdminShell>
  );
}
