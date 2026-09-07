"use client";

import { useRef, useState } from "react";
import { Input, Button } from "@/components/ui";
import { toLocalDateTimeInputValue } from "@/lib/utils";
import { noticeSchema, type NoticeInput } from "@/lib/validators";
import { NOTICE_CATEGORY_OPTIONS } from "@/lib/noticeCategory";
import {
  NOTICE_ATTACHMENT_MAX_BYTES,
  NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS,
} from "@/lib/noticeStorage";
import type { Notice, NoticeCategory, NoticeStatus } from "@/types";

interface NoticeFormProps {
  initialValue?: Partial<Notice>;
  // attachment নিজের আলাদা route দিয়ে upload হয় (দেখো
  // app/api/notices/[noticeId]/attachment/route.ts) — তাই page কে জানাতে হয়
  // এই submit এ নতুন file আছে কিনা, নাকি existing attachment সরাতে বলা হয়েছে
  onSubmit: (values: NoticeInput, opts: { file: File | null; removeAttachment: boolean }) => void;
  submitLabel?: string;
  // FINAL PLAN Step 7 — pin এ hard DB limit নেই, শুধু soft warning (৩+ পিন হলে)।
  // এই সংখ্যাটা এই ফর্মের notice বাদে বাকি সব notice এর মধ্যে যতগুলো is_pinned=true
  // (server component পাতা থেকে গোনা — দেখো notices/new ও notices/[noticeId]/edit)
  existingPinnedCount?: number;
  // পাতা (NewNoticeForm/EditNoticeForm) সেভ করার সময় true পাঠায় — বাটন disabled
  // হয়ে যায়, নাহলে দ্রুত দুইবার/তিনবার ট্যাপ করলে দুইবার onSubmit ফায়ার হয়ে
  // duplicate notice তৈরি হয়ে যেতে পারতো (ExamForm এর একই বাগ, একই ফিক্স)
  disabled?: boolean;
}

// datetime-local ইনপুট এর ভ্যালু থেকে UTC ISO string — ExamForm এর
// toISOOrEmpty এর মতোই একই guard (খালি/আজব ভ্যালুতে crash না করে schema তেই
// "সময় দাও" error হিসেবে ধরা পড়বে)
function toISOOrEmpty(localValue: string): string {
  if (!localValue) return "";
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export default function NoticeForm({
  initialValue,
  onSubmit,
  submitLabel = "সংরক্ষণ করো",
  existingPinnedCount = 0,
  disabled = false,
}: NoticeFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [category, setCategory] = useState<NoticeCategory>(initialValue?.category ?? "general");
  const [status, setStatus] = useState<NoticeStatus>(initialValue?.status ?? "draft");
  const [isPinned, setIsPinned] = useState(initialValue?.is_pinned ?? false);
  const [publishAt, setPublishAt] = useState(toLocalDateTimeInputValue(initialValue?.publish_at));
  const [expiresAt, setExpiresAt] = useState(toLocalDateTimeInputValue(initialValue?.expires_at ?? undefined));

  const [file, setFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAttachmentUrl = removeAttachment ? null : initialValue?.attachment_url ?? null;

  // ফাইল-পিকার এর native value রিসেট করা — নাহলে একই ফাইল বাতিল করে আবার
  // বাছাই করলে browser এটাকে "কোনো পরিবর্তন হয়নি" ধরে নিয়ে onChange ফায়ার
  // করবে না, state stuck হয়ে থাকবে
  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFileError(null);

    if (!picked) {
      setFile(null);
      return;
    }

    // Server এ যেই একই check হবে (দেখো app/api/notices/[noticeId]/attachment/route.ts),
    // এখানেও আগে থেকে দেখানো হচ্ছে যাতে আপলোড করে fail হওয়ার বদলে সাথে সাথে বোঝা যায়
    const lower = picked.name.toLowerCase();
    const extOk = NOTICE_ATTACHMENT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!extOk) {
      setFileError("শুধু PDF, JPG, অথবা PNG ফাইল আপলোড করা যাবে");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (picked.size > NOTICE_ATTACHMENT_MAX_BYTES) {
      setFileError("ফাইলের সাইজ ৪MB এর বেশি হতে পারবে না");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(picked);
    setRemoveAttachment(false); // নতুন ফাইল বাছাই করলে আগের "সরাও" নির্বাচন বাতিল
  }

  function handleRemoveAttachment() {
    setFile(null);
    setRemoveAttachment(true);
    resetFileInput();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    const values = {
      title,
      content,
      category,
      status,
      is_pinned: isPinned,
      publish_at: toISOOrEmpty(publishAt),
      expires_at: expiresAt ? toISOOrEmpty(expiresAt) : "",
      // গুরুত্বপূর্ণ: এখানে সবসময় ORIGINAL attachment_url পাঠানো হচ্ছে
      // (removeAttachment/file state যাই হোক না কেন) — কারণ attachment
      // add/replace/remove শুধু আলাদা attachment sub-route
      // (app/api/notices/[noticeId]/attachment) নিজেই DB তে সেভ করে।
      // এখানে যদি removeAttachment এর জন্য "" পাঠাতাম, তাহলে PATCH নিজেই
      // attachment_url কে null বসিয়ে দিতো, আর পরে attachment DELETE route
      // কল হলে সেটা existing.attachment_url ইতিমধ্যে null পেয়ে "কোনো
      // অ্যাটাচমেন্ট নেই" error দিতো, storage থেকে আসল ফাইল কখনো মুছতোই না।
      attachment_url: initialValue?.attachment_url ?? "",
    };

    const parsed = noticeSchema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "তথ্য সঠিক না, আবার চেক করো");
      return;
    }

    setFormError(null);
    onSubmit(parsed.data, { file, removeAttachment });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="নোটিশের তথ্য ফর্ম">
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}

      <Input label="শিরোনাম" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notice-content" className="text-sm font-medium text-ink-soft">
          বিবরণ (ঐচ্ছিক)
        </label>
        <textarea
          id="notice-content"
          value={content ?? ""}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notice-category" className="text-sm font-medium text-ink-soft">
            ক্যাটাগরি
          </label>
          <select
            id="notice-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as NoticeCategory)}
            className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            {NOTICE_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notice-status" className="text-sm font-medium text-ink-soft">
            অবস্থা
          </label>
          <select
            id="notice-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as NoticeStatus)}
            className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          >
            <option value="draft">খসড়া (draft)</option>
            <option value="published">প্রকাশিত (published)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="প্রকাশের সময়"
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          required
        />
        <Input
          label="মেয়াদ শেষ (ঐচ্ছিক)"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border-border text-gold focus:ring-gold/40"
          />
          পিন করো (সবার উপরে দেখাবে)
        </label>
        {/* FINAL PLAN Step 7 — hard limit নেই, শুধু soft warning: এই notice সহ
            পিন করা মোট ৩ বা তার বেশি হয়ে গেলে হালকা সতর্কতা, submit আটকায় না */}
        {isPinned && existingPinnedCount >= 2 && (
          <p className="text-xs text-ink-faint">
            ⚠️ ইতিমধ্যে {existingPinnedCount}টা নোটিশ পিন করা আছে — এটাসহ মোট{" "}
            {existingPinnedCount + 1}টা হয়ে যাবে। অনেকগুলো পিন করলে গুরুত্ব কমে
            যেতে পারে, প্রয়োজন না হলে কমিয়ে রাখাই ভালো।
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">অ্যাটাচমেন্ট (PDF/JPG/PNG, সর্বোচ্চ ৪MB)</span>

        {currentAttachmentUrl && !file && (
          <div className="flex items-center gap-3 text-sm">
            <a
              href={currentAttachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline"
            >
              বর্তমান অ্যাটাচমেন্ট দেখো
            </a>
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="text-danger underline"
            >
              সরাও
            </button>
          </div>
        )}

        {file && (
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span>নির্বাচিত: {file.name}</span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                resetFileInput();
              }}
              className="text-danger underline"
            >
              বাতিল করো
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          className="text-sm text-ink-soft file:mr-3 file:rounded-card file:border file:border-border file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-black/[0.03]"
        />
        {fileError && (
          <p role="alert" className="text-sm text-danger">
            {fileError}
          </p>
        )}
      </div>

      <Button type="submit" disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
