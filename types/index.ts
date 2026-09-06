// Shared TypeScript types — DB schema (supabase/schema.sql) এর সাথে মিলিয়ে বানানো

export type ExamStatus = "draft" | "published" | "closed";
export type OptionKey = "A" | "B" | "C" | "D";

export interface Exam {
  id: string;
  title: string;
  start_time: string; // ISO timestamp
  end_time: string;
  duration_minutes: number;
  status: ExamStatus;
  created_at: string;
}

// Notice board (Step 18) — supabase/step18-notices.sql এর সাথে মিলিয়ে বানানো
export type NoticeCategory =
  | "result"
  | "off_day"
  | "routine"
  | "admission"
  | "urgent"
  | "general";

export type NoticeStatus = "draft" | "published";

export interface Notice {
  id: string;
  title: string;
  content: string | null;
  category: NoticeCategory;
  attachment_url: string | null;
  status: NoticeStatus;
  is_pinned: boolean;
  publish_at: string; // ISO timestamp
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Public/ticker এ পাঠানোর জন্য — admin-only ফিল্ড (status, created_at, updated_at)
// বাদ, কারণ client এ এগুলোর দরকার নেই (Question এর PublicQuestion pattern অনুসরণ করে)
export type PublicNotice = Pick<
  Notice,
  "id" | "title" | "content" | "category" | "attachment_url" | "is_pinned" | "publish_at" | "expires_at"
>;

// admin question list/edit (GET /api/questions?exam_id=..., QuestionList.tsx,
// QuestionForm.tsx) — exam_id/order_index/created_at বাদ, response/UI তে অব্যবহৃত
// (exam_id route param থেকেই জানা, order_index শুধু query-level sort এ লাগে)
export interface Question {
  id: string;
  question_text: string; // MathJax LaTeX থাকতে পারে
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: OptionKey;
  explanation: string | null;
}

// Student কে exam screen এ দেখানোর জন্য — correct_option/explanation বাদ (leak
// এড়াতে), আর exam_id/order_index/created_at ও বাদ (client এ অব্যবহৃত, দেখো
// app/api/exams/[examId]/questions/route.ts)
export type PublicQuestion = Pick<
  Question,
  "id" | "question_text" | "option_a" | "option_b" | "option_c" | "option_d"
>;

// admin student-list এর জন্য (GET /api/attempts?exam_id=... , StudentTable.tsx) —
// exam_id/submitted_at বাদ, কারণ ওই response/UI এ ব্যবহৃত হয় না
export interface Attempt {
  id: string;
  student_name: string;
  student_phone: string;
  student_institution: string;
  started_at: string;
  score: number | null;
  total_questions: number | null;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: OptionKey | null;
}
