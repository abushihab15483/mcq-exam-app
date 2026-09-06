"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";

interface DeleteNoticeButtonProps {
  noticeId: string;
  noticeTitle: string;
}

// DeleteExamButton এর হুবহু একই pattern — app এর নিজের DELETE endpoint কল
// করে, যাতে attachment cleanup + revalidatePath ঠিকঠাক হয় (Supabase Table
// Editor থেকে সরাসরি row মুছলে এই দুটোই miss হয়ে যেত)
export default function DeleteNoticeButton({ noticeId, noticeTitle }: DeleteNoticeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/notices/${noticeId}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "মুছে ফেলা যায়নি");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        মুছে ফেলো
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="নোটিশ মুছে ফেলবে?">
        <p className="text-ink-soft mb-2">
          <span className="font-medium text-ink">{noticeTitle}</span> স্থায়ীভাবে মুছে যাবে, সাথে
          এর attachment (থাকলে) ও মুছে যাবে। এটা আর ফিরিয়ে আনা যাবে না।
        </p>
        {error && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            বাতিল করো
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "মুছে ফেলা হচ্ছে..." : "মুছে ফেলো"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
