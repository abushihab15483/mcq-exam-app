// Notice category — বাংলা label আর badge রঙ, একটা জায়গায় রাখা হলো যাতে
// admin list (Step 4) আর public notice card/ticker (Step 5-6) দুই জায়গাতেই
// একই label/রঙ ব্যবহার হয়, কখনো out-of-sync না হয়।
//
// FINAL PLAN এর রঙ mapping (existing tailwind token, নতুন color না):
// ফলাফল→gold, জরুরি→danger, ভর্তি→success, ছুটি→ink-faint, রুটিন→ink-soft,
// সাধারণ→border/ink-faint — রুটিন+সাধারণ ইচ্ছাকৃতভাবে একই neutral/ধূসর
// পরিবারে, মূল পার্থক্য বাংলা label টেক্সট দিয়েই বোঝা যায়।
import type { NoticeCategory } from "@/types";

export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  result: "ফলাফল",
  off_day: "ছুটি",
  routine: "রুটিন",
  admission: "ভর্তি",
  urgent: "জরুরি",
  general: "সাধারণ",
};

// ExamStatusBadge এর মতোই একই badge shape (rounded-full border px-2.5
// py-0.5 text-xs font-medium) — শুধু className বদলাচ্ছে
export const NOTICE_CATEGORY_BADGE_CLASSES: Record<NoticeCategory, string> = {
  result: "border-gold/30 bg-gold/10 text-gold",
  urgent: "border-danger/30 bg-danger/10 text-danger",
  admission: "border-success/30 bg-success/10 text-success",
  off_day: "border-border text-ink-faint",
  routine: "border-border text-ink-soft",
  general: "border-border bg-black/[0.02] text-ink-faint",
};

// <select> এর option বানানোর জন্য — schema enum এর ক্রম অনুযায়ী
export const NOTICE_CATEGORY_OPTIONS: { value: NoticeCategory; label: string }[] = (
  Object.keys(NOTICE_CATEGORY_LABELS) as NoticeCategory[]
).map((value) => ({ value, label: NOTICE_CATEGORY_LABELS[value] }));
