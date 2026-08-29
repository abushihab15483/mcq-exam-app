"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";

interface DeleteExamButtonProps {
  examId: string;
  examTitle: string;
}

// admin panel থেকেই exam delete করার বাটন — এটা না থাকায় আগে সবাই Supabase
// table editor থেকে সরাসরি row delete করত, যেটা app-এর DELETE API/
// revalidatePath বাইপাস করে যেত (তাই delete করার পরও UI-তে exam-টা "থেকে
// যেত", cache-এ পুরনো ডেটা আটকে থাকত)। এই বাটন দিয়ে delete করলে app-এর নিজের
// DELETE endpoint কল হয়, ফলে সব প্রাসঙ্গিক page (/exams, /results, /exam, /)
// সাথে সাথেই আপডেট হয়ে যায়।
export default function DeleteExamButton({ examId, examTitle }: DeleteExamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
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

      <Modal open={open} onClose={() => setOpen(false)} title="পরীক্ষা মুছে ফেলবে?">
        <p className="text-ink-soft mb-2">
          <span className="font-medium text-ink">{examTitle}</span> স্থায়ীভাবে মুছে যাবে — এর সাথে
          জড়িত সব প্রশ্ন, attempt ও ফলাফল ডেটাও প্রভাবিত হতে পারে। এটা আর ফিরিয়ে আনা যাবে না।
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
