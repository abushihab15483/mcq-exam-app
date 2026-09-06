import AdminShell from "@/components/admin/AdminShell";
import EditNoticeForm from "@/components/admin/EditNoticeForm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Notice } from "@/types";

// এই notice এর status draft/published/expired যাই হোক না কেন admin কে পুরো
// data দেখাতে হবে — public GET (/api/notices) filtered, তাই সেটা এখানে কাজে
// আসবে না। কোনো নতুন public GET-by-id route না বানিয়ে ExamDetailLayout এর
// মতোই এখানে সরাসরি createAdminClient() দিয়ে server component এ fetch করা
// হলো (RLS bypass করে, কারণ এটা admin-only পেজ, middleware.ts দিয়ে আগেই
// protected)।
export const dynamic = "force-dynamic";

export default async function EditNoticePage({
  params,
  searchParams,
}: {
  params: { noticeId: string };
  searchParams: { uploadError?: string };
}) {
  const supabase = createAdminClient();
  const { data: notice, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", params.noticeId)
    .single<Notice>();

  if (error || !notice) {
    return (
      <AdminShell>
        <div className="rounded-card border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-medium">নোটিশ পাওয়া যায়নি</p>
          <p className="mt-1 text-sm">{error?.message ?? "এই আইডির কোনো নোটিশ নেই"}</p>
        </div>
      </AdminShell>
    );
  }

  // FINAL PLAN Step 7 — soft pin warning: এই notice বাদে বাকি কতগুলো is_pinned=true
  // (নিজেকে .neq দিয়ে বাদ, নাহলে already-pinned notice এডিট করলেই নিজের গণনা নিজেই
  // একবার বেশি হয়ে যেতো)
  const { count: otherPinnedCount } = await supabase
    .from("notices")
    .select("id", { count: "exact", head: true })
    .eq("is_pinned", true)
    .neq("id", params.noticeId);

  return (
    <AdminShell>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">নোটিশ এডিট করো</h1>
      <EditNoticeForm
        notice={notice}
        initialError={searchParams.uploadError}
        existingPinnedCount={otherPinnedCount ?? 0}
      />
    </AdminShell>
  );
}
