"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { parseBulkQuestionsCsv, type ParsedQuestionRow } from "@/lib/csvQuestionImport";

interface BulkImportQuestionsProps {
  examId: string;
  onImported: () => void; // সফল হলে parent question list রিফ্রেশ করবে
}

// CSV আপলোড করে অনেক প্রশ্ন একসাথে import — একটা একটা করে QuestionForm এ
// টাইপ করার বদলে। প্রথমে client-side এ preview দেখায় (ভুল হলে সাথে সাথেই
// বোঝা যায়, সার্ভারে কল করার আগেই), তারপর "Import করো" চাপলে raw CSV
// সার্ভারে পাঠায় — সার্ভার নিজে আবার একই লজিক দিয়ে validate করে insert করে
// (client validation শুধু UX এর জন্য, সত্যিকারের check সবসময় server এ)।
export default function BulkImportQuestions({ examId, onImported }: BulkImportQuestionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedQuestionRow[]>([]);
  const [parseErrors, setParseErrors] = useState<{ rowNumber: number; message: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitRowErrors, setSubmitRowErrors] = useState<{ rowNumber: number; message: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetResults() {
    setSubmitError(null);
    setSubmitRowErrors([]);
    setSuccessMsg(null);
  }

  function handleText(text: string) {
    resetResults();
    setCsvText(text);
    const { rows: parsed, errors } = parseBulkQuestionsCsv(text);
    setRows(parsed);
    setParseErrors(errors);
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    handleText(text);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setSubmitting(true);
    resetResults();
    try {
      const res = await fetch(`/api/exams/${examId}/questions/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Import করা যায়নি");
        setSubmitRowErrors(data.rowErrors ?? []);
        return;
      }
      setSuccessMsg(`${data.imported}টা প্রশ্ন সফলভাবে যোগ হয়েছে`);
      setCsvText("");
      setFileName(null);
      setRows([]);
      setParseErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImported();
    } catch {
      setSubmitError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করো");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-card border border-border bg-paper">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="font-medium text-ink">CSV থেকে অনেক প্রশ্ন একসাথে Import করো</span>
        <span className="text-ink-soft text-sm">{expanded ? "লুকাও ▲" : "খোলো ▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <p className="text-sm text-ink-soft">
            CSV তে এই কলামগুলো থাকতে হবে (header, প্রথম সারি): <strong>প্রশ্ন</strong>,{" "}
            <strong>অপশন (ক)</strong>, <strong>অপশন (খ)</strong>, <strong>অপশন (গ)</strong>,{" "}
            <strong>অপশন (ঘ)</strong>, <strong>সঠিক উত্তর</strong> (মান ক/খ/গ/ঘ বা A/B/C/D)। ঐচ্ছিক:{" "}
            <strong>ব্যাখ্যা</strong>। ইংরেজি header (question, option_a...) ও চলবে।
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-border px-4 py-6 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              id="csv-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <label htmlFor="csv-file-input">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                CSV ফাইল বেছে নাও
              </Button>
            </label>
            <span className="text-xs text-ink-soft">অথবা এখানে ফাইল drag করে ছাড়ো</span>
            {fileName && <span className="text-sm text-ink">{fileName}</span>}
          </div>

          {parseErrors.length > 0 && (
            <div role="alert" className="rounded-card bg-danger/10 px-4 py-3 text-sm text-danger">
              <p className="font-medium mb-1">CSV তে সমস্যা পাওয়া গেছে:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseErrors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    {e.rowNumber > 0 ? `সারি ${e.rowNumber}: ` : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
              {parseErrors.length > 10 && (
                <p className="mt-1 text-xs">... আরও {parseErrors.length - 10}টা সমস্যা আছে</p>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {rows.length}টা প্রশ্ন পাওয়া গেছে — প্রিভিউ (প্রথম ৫টা):
              </p>
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-black/[0.03]">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">প্রশ্ন</th>
                      <th className="px-3 py-2 text-left">সঠিক উত্তর</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r) => (
                      <tr key={r.rowNumber} className="border-t border-border">
                        <td className="px-3 py-2 text-ink-soft">{r.rowNumber}</td>
                        <td className="px-3 py-2 text-ink">{r.question_text}</td>
                        <td className="px-3 py-2 text-ink">{r.correct_option}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {submitError && (
            <div role="alert" className="rounded-card bg-danger/10 px-4 py-3 text-sm text-danger">
              <p>{submitError}</p>
              {submitRowErrors.length > 0 && (
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {submitRowErrors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      সারি {e.rowNumber}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {successMsg && (
            <p role="status" className="rounded-card bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleImport}
              disabled={rows.length === 0 || parseErrors.length > 0 || submitting}
            >
              {submitting ? "Import হচ্ছে..." : `${rows.length || ""} প্রশ্ন Import করো`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
