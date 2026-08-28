import { Loader } from "@/components/ui";

// অ্যাডমিন গ্রুপের রুটগুলো (ড্যাশবোর্ড, পরীক্ষার তালিকা, ইত্যাদি) সার্ভারে ডেটা আনতে
// থাকা অবস্থায় এই fallback দেখাবে — same fullPage Loader, আলাদা কোনো নতুন component নয়।
export default function Loading() {
  return <Loader fullPage size="lg" />;
}
