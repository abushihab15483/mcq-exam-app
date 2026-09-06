"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { Notice } from "@/types";

interface PinToggleButtonProps {
  notice: Notice;
}

// PATCH route পুরো noticeSchema আশা করে (partial update না, ExamForm এর PUT
// এর মতোই full replace) — তাই pin/unpin করতে হলেও notice এর বাকি সব ফিল্ড
// অপরিবর্তিত রেখে শুধু is_pinned flip করে পুরো body টা পাঠাতে হচ্ছে
export default function PinToggleButton({ notice }: PinToggleButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/notices/${notice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: notice.title,
        content: notice.content ?? "",
        category: notice.category,
        attachment_url: notice.attachment_url ?? "",
        status: notice.status,
        is_pinned: !notice.is_pinned,
        publish_at: notice.publish_at,
        expires_at: notice.expires_at ?? "",
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "পিন করা যায়নি");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={handleToggle} disabled={loading}>
        {notice.is_pinned ? "আনপিন করো" : "পিন করো"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
