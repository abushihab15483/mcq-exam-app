"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import NoticeForm from "@/components/admin/NoticeForm";
import Card from "@/components/ui/Card";
import type { NoticeInput } from "@/lib/validators";

export default function NewNoticePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sequencing (FINAL PLAN Step 3): notice আগে insert করে id পাওয়া, তারপর
  // সেই id দিয়ে attachment upload — নতুন notice এ attachment_url সবসময়ই
  // খালি পাঠানো হচ্ছে (create এ কখনো সরাসরি URL বসানো হয় না)
  async function handleSubmit(values: NoticeInput, opts: { file: File | null; removeAttachment: boolean }) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, attachment_url: "" }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSaving(false);
      setError(data.error ?? "তৈরি করা যায়নি");
      return;
    }

    const noticeId = data.notice.id as string;

    if (opts.file) {
      const formData = new FormData();
      formData.append("file", opts.file);
      const uploadRes = await fetch(`/api/notices/${noticeId}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => null);
        setSaving(false);
        // notice আগে থেকেই তৈরি হয়ে গেছে (attachment ছাড়া) — তাই এডিট পেজে
        // পাঠানো হচ্ছে যাতে আবার চেষ্টা করা যায় (আবার "তৈরি করো" করলে
        // duplicate notice তৈরি হয়ে যেতো, তাই নতুন POST না, এডিট পেজেই retry)।
        // এই component এখনই unmount হয়ে যাবে (router.push), তাই error state
        // এখানে দেখানো যাবে না — query param দিয়ে edit page কে জানানো হচ্ছে,
        // যাতে redirect এর পরেও admin আসল কারণটা দেখতে পায়।
        const message = uploadData?.error ?? "ফাইল আপলোড করা যায়নি";
        router.push(
          `/notices/${noticeId}/edit?uploadError=${encodeURIComponent(
            `${message} — নোটিশটি সংরক্ষিত হয়েছে, এখান থেকে আবার আপলোড চেষ্টা করো।`
          )}`
        );
        router.refresh();
        return;
      }
    }

    setSaving(false);
    router.push("/notices");
    router.refresh();
  }

  return (
    <AdminShell>
      <h1 className="font-display text-2xl font-semibold text-ink mb-6">নতুন নোটিশ তৈরি করো</h1>
      <Card className="max-w-lg">
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}
        <NoticeForm onSubmit={handleSubmit} submitLabel={saving ? "সংরক্ষণ হচ্ছে..." : "নোটিশ তৈরি করো"} />
      </Card>
    </AdminShell>
  );
}
