"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NoticeForm from "./NoticeForm";
import Card from "@/components/ui/Card";
import type { NoticeInput } from "@/lib/validators";
import type { Notice } from "@/types";

interface EditNoticeFormProps {
  notice: Notice;
  // "notices/new" থেকে attachment upload fail হয়ে redirect হলে এই query
  // param দিয়ে কারণটা এখানে দেখানো হয় (দেখো app/(admin)/notices/new/page.tsx)
  initialError?: string;
  // FINAL PLAN Step 7 — soft pin warning: এই notice বাদে বাকি কতগুলো is_pinned=true
  // (app/(admin)/notices/[noticeId]/edit/page.tsx থেকে গোনা, নিজেকে বাদ দিয়ে)
  existingPinnedCount: number;
}

export default function EditNoticeForm({ notice, initialError, existingPinnedCount }: EditNoticeFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [saving, setSaving] = useState(false);
  // দ্রুত ২-৩ বার ট্যাপে duplicate PATCH call আটকাতে — দেখো NewNoticeForm.tsx
  // এর একই কমেন্ট (savingRef কেন state এর বদলে ref)
  const savingRef = useRef(false);

  async function handleSubmit(
    values: NoticeInput,
    opts: { file: File | null; removeAttachment: boolean }
  ) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    // মূল ফিল্ড আগে সেভ — NoticeForm সবসময় ORIGINAL attachment_url পাঠায়
    // (নিজে কখনো বদলায় না), আসল attachment_url বসানো/মোছা নিচের আলাদা কল
    // দুটো (upload/delete) করবে, PATCH কখনো attachment_url touch করে না
    const res = await fetch(`/api/notices/${notice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();

    if (!res.ok) {
      savingRef.current = false;
      setSaving(false);
      setError(data.error ?? "আপডেট করা যায়নি");
      return;
    }

    if (opts.file) {
      const formData = new FormData();
      formData.append("file", opts.file);
      const uploadRes = await fetch(`/api/notices/${notice.id}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => null);
        savingRef.current = false;
        setSaving(false);
        setError(uploadData?.error ?? "ফাইল আপলোড করা যায়নি");
        return;
      }
    } else if (opts.removeAttachment && notice.attachment_url) {
      const removeRes = await fetch(`/api/notices/${notice.id}/attachment`, { method: "DELETE" });
      if (!removeRes.ok) {
        const removeData = await removeRes.json().catch(() => null);
        savingRef.current = false;
        setSaving(false);
        setError(removeData?.error ?? "অ্যাটাচমেন্ট সরানো যায়নি");
        return;
      }
    }

    router.push("/notices");
    router.refresh();
    // savingRef ইচ্ছাকৃতভাবে reset করা হচ্ছে না — component এখনই unmount হচ্ছে,
    // দেখো NewNoticeForm.tsx এর একই কমেন্ট
  }

  return (
    <Card className="max-w-lg">
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      <NoticeForm
        initialValue={notice}
        onSubmit={handleSubmit}
        submitLabel={saving ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করো"}
        existingPinnedCount={existingPinnedCount}
        disabled={saving}
      />
    </Card>
  );
}
