import { Loader } from "@/components/ui";

// এই গ্রুপের সব রুট (হোম, পরীক্ষার তালিকা, লাইভ, রেজাল্ট এন্ট্রি, about, contact) সার্ভার
// থেকে ডেটা আনতে থাকা অবস্থায় এই fallback দেখাবে — বিদ্যমান fullPage Loader পুনঃব্যবহার
// করা হলো, নতুন কোনো UI/dependency তৈরি করা হয়নি।
export default function Loading() {
  return <Loader fullPage size="lg" />;
}
