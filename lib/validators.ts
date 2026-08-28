import { z } from "zod";

// Bangladeshi mobile format: 01 + [3-9] + 8 digit = 11 digit মোট
export const studentEntrySchema = z.object({
  student_name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
  student_phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক ফোন নাম্বার দাও (যেমন: 01712345678)"),
  student_institution: z.string().trim().min(2, "স্কুল/কলেজের নাম কমপক্ষে ২ অক্ষরের হতে হবে"),
});

export type StudentEntryInput = z.infer<typeof studentEntrySchema>;

// Result lookup — শুধু ফোন নাম্বার দিয়ে result খোঁজা এখন আর যথেষ্ট নিরাপদ না
// (কেউ ফোন নাম্বার guess/brute-force করলেই অন্য student এর নাম+score+institution
// দেখে ফেলতে পারতো)। তাই এখন ফোন নাম্বারের সাথে ওই student এর নাম-ও লাগবে —
// exam শুরু করার সময় যেই নাম দিয়েছিল, ঠিক সেটাই (case-insensitive) — schema তে
// নতুন কোনো কলাম যোগ না করেই এই ২-factor check করা যাচ্ছে।
export const resultLookupSchema = z.object({
  exam_id: z.string().uuid("সঠিক exam না"),
  student_name: z.string().trim().min(2, "নাম দাও"),
  student_phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক ফোন নাম্বার দাও (যেমন: 01712345678)"),
});

export type ResultLookupInput = z.infer<typeof resultLookupSchema>;

// Fix #11 — exam start_time/end_time/duration_minutes এর মধ্যে logical
// সম্পর্ক আগে কোথাও check হতো না, ফলে admin ভুলে এমন exam বানাতে পারতো যেখানে
// end_time আসলে start_time এর আগে, বা duration_minutes পুরো window এর চেয়ে
// বড় — দুটোই student এর জন্য confusing/ভাঙা exam অভিজ্ঞতা তৈরি করত
// (getExamWindowStatus কখনো "active" ফেরত দিত না, বা মাঝপথে হঠাৎ hard-cut হতো)।
//
// এই schema-ই একমাত্র সত্যের উৎস — client (ExamForm) আর server (POST/PUT
// দুটো route) একই object ব্যবহার করে, তাই নিয়ম কখনো out-of-sync হতে পারবে না।
//
// start_time/end_time এই প্রজেক্টে সবসময় timezone-aware ISO string হিসেবে আসে
// (ExamForm এ <input type="datetime-local"> কে browser এর local timezone ধরে
// .toISOString() দিয়ে UTC তে বদলানো হয়, lib/time.ts এর মতোই) — তাই এখানে নতুন
// কোনো timezone ধারণা যোগ করা হয়নি, শুধু new Date(...).getTime() দিয়ে ওই
// একই ISO string দুটো তুলনা করা হচ্ছে (string comparison না, actual epoch ms)।
// এই তুলনা সেকেন্ড/মিলিসেকেন্ড precision এর জন্যও স্বয়ংক্রিয়ভাবে সঠিক, কারণ
// getTime() এর পার্থক্যটা raw মিলিসেকেন্ডে হিসেব হয়, আলাদা করে round করা হয় না।
export const examSchema = z
  .object({
    title: z.string().trim().min(2, "পরীক্ষার নাম দাও"),
    start_time: z.string().min(1, "শুরুর সময় দাও"),
    end_time: z.string().min(1, "শেষ সময় দাও"),
    duration_minutes: z.coerce.number().int().positive("সময়কাল ঠিক দাও"),
    status: z.enum(["draft", "published", "closed"]),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();

    if (Number.isNaN(start)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["start_time"], message: "শুরুর সময় সঠিক না" });
      return; // start_time-ই invalid হলে নিচের তুলনাগুলো অর্থহীন, একসাথে একগাদা confusing error দেখানোর দরকার নাই
    }
    if (Number.isNaN(end)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["end_time"], message: "শেষ সময় সঠিক না" });
      return;
    }
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_time"],
        message: "শেষ সময় অবশ্যই শুরুর সময়ের পরে হতে হবে।",
      });
      return; // window-ই invalid, তাই duration-vs-window check (নিচে) এখানে অর্থহীন
    }
    const windowMinutes = (end - start) / 60_000;
    if (data.duration_minutes > windowMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["duration_minutes"],
        message: "পরীক্ষার সময়কাল পরীক্ষা শুরুর ও শেষ সময়ের মধ্যে সম্পূর্ণভাবে ফিট করতে হবে।",
      });
    }
  });

export type ExamInput = z.infer<typeof examSchema>;

// Contact form — আগে কোনো backend ছিল না, submit করলে শুধু client-side
// "পাঠানো হয়েছে" দেখাত, বার্তা কোথাও সেভ হতো না। এখন app/api/contact/route.ts
// এই schema দিয়েই ভ্যালিডেট করে supabase তে সেভ করে।
export const contactMessageSchema = z.object({
  full_name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষরের হতে হবে").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক ফোন নাম্বার দাও (যেমন: 01712345678)"),
  email: z.string().trim().email("সঠিক ইমেইল ঠিকানা দাও").max(150).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5, "মেসেজ কমপক্ষে ৫ অক্ষরের হতে হবে").max(2000, "মেসেজ অনেক বড়, ছোট করে লেখো"),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
