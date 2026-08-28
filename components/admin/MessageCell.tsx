"use client";

// অ্যাডমিন প্যানেলের "মেসেজ" টেবিলে আগে message কলাম শুধু ২ লাইন দেখিয়ে
// (line-clamp-2) কেটে দিত — বড় মেসেজ পুরোটা দেখার কোনো উপায় ছিল না।
// এখন ২ লাইনের বেশি হলে "পুরোটা দেখো" বাটন আসে, ক্লিক করলে Modal-এ পুরো
// মেসেজ (word-wrap সহ, যত বড়ই হোক) দেখা যায়।
import { useState } from "react";
import Modal from "@/components/ui/Modal";

interface MessageCellProps {
  message: string;
  fullName: string;
  subject: string | null;
}

export default function MessageCell({ message, fullName, subject }: MessageCellProps) {
  const [open, setOpen] = useState(false);
  // ২ লাইনে মোটামুটি আঁটে এমন length-এর বেশি হলেই "পুরোটা দেখো" দেখানো হবে,
  // নাহলে ছোট মেসেজেও অকারণে বাটন দেখাবে
  const isLong = message.length > 80;

  return (
    <>
      <div className="max-w-xs">
        <span className="line-clamp-2 whitespace-pre-wrap">{message}</span>
        {isLong && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 block text-xs font-medium text-gold hover:underline"
          >
            পুরোটা দেখো
          </button>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={subject || "মেসেজ"} className="max-w-lg">
        <p className="text-sm font-medium text-ink-soft">{fullName}</p>
        <p className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-[1.8] text-ink">
          {message}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 rounded-card bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-ink/90"
        >
          বন্ধ করো
        </button>
      </Modal>
    </>
  );
}
