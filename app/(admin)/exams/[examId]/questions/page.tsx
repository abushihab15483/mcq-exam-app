"use client";

import { useEffect, useState } from "react";
import QuestionList from "@/components/admin/QuestionList";
import QuestionForm from "@/components/admin/QuestionForm";
import BulkImportQuestions from "@/components/admin/BulkImportQuestions";
import { Button, Modal } from "@/components/ui";
import type { Question } from "@/types";

export default function QuestionsPage({ params }: { params: { examId: string } }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    const qData = await fetch(`/api/questions?exam_id=${params.examId}`).then((r) => r.json());
    setQuestions(qData.questions ?? []);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.examId]);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setModalOpen(true);
  }

  async function handleFormSubmit(values: Omit<Question, "id">) {
    setError(null);
    const res = editing
      ? await fetch("/api/questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...values }),
        })
      : await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exam_id: params.examId, ...values }),
        });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "সংরক্ষণ করা যায়নি");
      return;
    }
    setModalOpen(false);
    loadData();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch("/api/questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    if (res.ok) {
      setDeleteTarget(null);
      loadData();
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">প্রশ্ন ব্যবস্থাপনা</h1>
        <Button onClick={openAdd}>নতুন প্রশ্ন যোগ করো</Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {error}
        </p>
      )}

      <BulkImportQuestions examId={params.examId} onImported={loadData} />

      <QuestionList questions={questions} onEdit={openEdit} onDelete={setDeleteTarget} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "প্রশ্ন এডিট করো" : "নতুন প্রশ্ন"}
        className="max-w-lg"
      >
        <QuestionForm
          initialValue={editing ?? undefined}
          onSubmit={handleFormSubmit}
          submitLabel={editing ? "পরিবর্তন সংরক্ষণ করো" : "প্রশ্ন যোগ করো"}
        />
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="প্রশ্ন মুছে ফেলবে?">
        <p className="text-ink-soft mb-6">এই প্রশ্নটা স্থায়ীভাবে মুছে যাবে, এটা আর ফিরিয়ে আনা যাবে না।</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            বাতিল করো
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            মুছে ফেলো
          </Button>
        </div>
      </Modal>
    </>
  );
}
