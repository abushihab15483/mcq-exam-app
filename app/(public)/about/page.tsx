import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "আমাদের সম্পর্কে",
  description: "জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার অংকুর জামালপুর শাখার লক্ষ্য, স্বপ্ন ও অভিজ্ঞ শিক্ষকমণ্ডলীর সাথে পরিচিত হও।",
  alternates: { canonical: "/about" },
};

// ছবি যোগ করতে: public/images/coaching/teachers/ ফোল্ডারে ছবি রেখে নিচে
// প্রতিটা মানুষের `photo` ফিল্ডে path বসাও (যেমন "/images/coaching/teachers/rafiqul.webp")।
// `photo` ফাঁকা/না-দেওয়া থাকলে placeholder (ধূসর গোল বৃত্ত) দেখাবে।
const TEACHERS = [
  { name: "আল মামুন", subject: "পরিচালক, অংকুর কোচিং", photo: "/images/coaching/teachers/al-mamun.webp" },
  { name: "এনামুল হক ফরিদ", subject: "উপদেষ্টা, অংকুর কোচিং", photo: "/images/coaching/teachers/enamul-haque-farid.webp" },
  { name: "মাইনুল হক সুজা", subject: "উপদেষ্টা, অংকুর কোচিং", photo: "/images/coaching/teachers/mainul-haque-suja.webp" },
];

// অভিজ্ঞ শিক্ষক মন্ডলী — এখানে পরে আরও শিক্ষক যোগ হবে, নতুন কেউ যোগ করলে
// এই array-র শুরুতে (বা যেখানে চাও) একটা entry বসিয়ে দিলেই card চলে আসবে।
// `badge` (optional) — কার্ডের উপরের কোণায় ছোট্ট লেবেল দেখাতে চাইলে টেক্সট দাও, না চাইলে বাদ দাও।
const STAFF = [
  {
    name: "আবু শিহাব",
    subject: "জামালপুর মেডিকেল কলেজ",
    photo: "/images/coaching/teachers/abu-shihab.webp",
    badge: "এই ওয়েবসাইট তৈরি করেছেন",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="font-display text-3xl font-semibold text-ink">অনুশীলন কোচিং সেন্টার</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার — মানসম্মত শিক্ষা ও যত্নসহকারে পরীক্ষার প্রস্তুতি।
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Card>
            <h3 className="font-display font-semibold text-ink">আমাদের লক্ষ্য (Mission)</h3>
            <p className="mt-2 text-sm text-ink-soft">
              প্রতিটি শিক্ষার্থীকে মানসম্মত শিক্ষা উপকরণ ও নিয়মিত মূল্যায়নের মাধ্যমে পরীক্ষায় সেরা ফলাফল অর্জনে সাহায্য করা।
            </p>
          </Card>
          <Card>
            <h3 className="font-display font-semibold text-ink">আমাদের স্বপ্ন (Vision)</h3>
            <p className="mt-2 text-sm text-ink-soft">
              জামালপুরের প্রতিটি শিক্ষার্থীর জন্য প্রযুক্তিনির্ভর, সহজলভ্য ও মানসম্মত পরীক্ষা প্রস্তুতির প্ল্যাটফর্ম হয়ে ওঠা।
            </p>
          </Card>
        </div>

        <div className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">আমাদের পরিচালনা পর্ষদ</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEACHERS.map((t) => (
              <Card key={t.name} className="text-center">
                {t.photo ? (
                  <Image
                    src={t.photo}
                    alt={t.name}
                    width={96}
                    height={96}
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto h-24 w-24 rounded-full bg-ink/5" aria-hidden="true" />
                )}
                <h3 className="mt-4 font-display font-semibold text-ink">{t.name}</h3>
                <p className="mt-1 text-sm text-ink-faint">{t.subject}</p>
              </Card>
            ))}
          </div>
        </div>
        <div className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">আমাদের অভিজ্ঞ শিক্ষক মন্ডলী</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STAFF.map((t) => (
              <Card key={t.name} className="relative overflow-hidden text-center">
                {t.badge && (
                  <span className="absolute left-0 top-4 -translate-x-[26%] -rotate-45 whitespace-nowrap bg-gold px-8 py-1 text-[11px] font-semibold tracking-wide text-ink shadow-soft">
                    {t.badge}
                  </span>
                )}
                {t.photo ? (
                  <Image
                    src={t.photo}
                    alt={t.name}
                    width={96}
                    height={96}
                    className="mx-auto h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto h-24 w-24 rounded-full bg-ink/5" aria-hidden="true" />
                )}
                <h3 className="mt-4 font-display font-semibold text-ink">{t.name}</h3>
                <p className="mt-1 text-sm text-ink-faint">{t.subject}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
