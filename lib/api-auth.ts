// Route handler এর ভিতর admin logged-in কিনা check করার helper।
// middleware.ts শুধু page route (/dashboard, /exams) protect করে — API route নিজে থেকে
// এই function দিয়ে session check করতে হয়, নাহলে যে কেউ সরাসরি API কল করে
// exam/question বদলে ফেলতে পারবে।
//
// getSession() না, getUser() — কেন:
// getSession() cookie-তে যা আছে তাই সরাসরি ফেরত দেয়, signature/authenticity
// কখনো যাচাই করে না (Supabase নিজেই এটাকে "may not be authentic" বলে ওয়ার্ন
// করে — https://github.com/supabase/supabase-js/issues/1706)। তার মানে কেউ
// hand-crafted/forged session cookie পাঠালেও getSession() সেটাকে valid ধরে
// নিতে পারে — admin panel (exam/question/correct-answer বদলানো, student data
// দেখা/মোছা) পুরোপুরি bypass হয়ে যেতে পারে, কারণ middleware.ts আর এই
// function — দুটোই আগে শুধু এই একটা check এর উপর নির্ভর করত। getUser()
// প্রতিবার Supabase Auth server-কে জিজ্ঞেস করে token টা আসলেই বৈধ কিনা —
// তাই এটাই একমাত্র trustworthy check।
import { createClient } from "@/lib/supabase/server";

export async function getAdminSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
