"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NoticeForm from "@/components/admin/NoticeForm";
import Card from "@/components/ui/Card";
import type { NoticeInput } from "@/lib/validators";

interface NewNoticeFormProps {
  // FINAL PLAN Step 7 — soft pin warning এর জন্য, app/(admin)/notices/new/page.tsx
  // (server component) থেকে গোনা বর্তমান is_pinned=true সংখ্যা
  existingPinnedCount: number;
}

// notices/new/page.tsx আগে নিজেই "use client" ছিল (পুরো ফর্ম লজিক সহ) — Step 7 এ
// pinned count সার্ভার থেকে আনতে হবে বলে page.tsx কে server component বানানো হলো,
// আগের client লজিক অপরিবর্তিত রেখে এখানে সরানো হয়েছে।
export default function NewNoticeForm({ existingPinnedCount }: NewNoticeFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // useRef — setState ব্যাচড/asynchronous বলে দ্রুত ২-৩ বার ট্যাপ করলে re-render
  // হওয়ার আগেই দ্বিতীয়/তৃতীয় ক্লিক চলে আসতে পারে, ref সবসময় সিঙ্ক্রোনাস —
  // এটাই আসল guard, নিচের disabled prop (Button UI) দ্বিতীয় স্তরের সুরক্ষা
  const savingRef = useRef(false);

  // Sequencing (FINAL PLAN Step 3): notice আগে insert করে id পাওয়া, তারপর
  // সেই id দিয়ে attachment upload — নতুন notice এ attachment_url সবসময়ই
  // খালি পাঠানো হচ্ছে (create এ কখনো সরাসরি URL বসানো হয় না)
  async function handleSubmit(values: NoticeInput, opts: { file: File | null; removeAttachment: boolean }) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, attachment_url: "" }),
    });
    const data = await res.json();

    if (!res.ok) {
      savingRef.current = false;
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
        savingRef.current = false;
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

    router.push("/notices");
    router.refresh();
    // savingRef ইচ্ছাকৃতভাবে reset করা হচ্ছে না — component এখনই unmount হচ্ছে
    // (router.push), reset করলে navigation শেষ হওয়ার আগে বাটন আবার সক্রিয়
    // হয়ে দ্বিতীয় submit-এর সুযোগ তৈরি হতে পারত
  }

  return (
    <Card className="max-w-lg">
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}
      <NoticeForm
        onSubmit={handleSubmit}
        submitLabel={saving ? "সংরক্ষণ হচ্ছে..." : "নোটিশ তৈরি করো"}
        existingPinnedCount={existingPinnedCount}
        disabled={saving}
      />
    </Card>
  );
}
