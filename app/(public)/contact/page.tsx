import type { Metadata } from "next";
import Header from "@/components/coaching/Header";
import Footer from "@/components/coaching/Footer";
import ContactForm from "@/components/coaching/ContactForm";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "যোগাযোগ",
  description: "ভর্তি, ক্লাস রুটিন বা যেকোনো প্রশ্নের জন্য অংকুর জামালপুর শাখার সাথে যোগাযোগ করো — ঠিকানা, ফোন নাম্বার ও সরাসরি মেসেজ ফর্ম।",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="font-display text-3xl font-semibold text-ink">আমাদের সাথে যোগাযোগ করুন</h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <ContactForm />

          <div className="space-y-5">
            <Card>
              <h2 className="font-display font-semibold text-ink">যোগাযোগের তথ্য</h2>
              <ul className="mt-4 space-y-4 text-sm text-ink-soft">
                <li>
                  <span className="block font-medium text-ink">ঠিকানা</span>
                  রেখা প্লাজা, পাঁচরাস্তা মোড়, জামালপুর
                </li>
                <li>
                  <span className="block font-medium text-ink">ফোন</span>
                  ০১৭১৮-৫২৩৯৯৬, ০১৬৭৫-২০৪১১৩
                </li>
                <li>
                  <span className="block font-medium text-ink">ইমেইল</span>
                  almamunjamalpur@gmail.com
                </li>
              </ul>
            </Card>
            <Card>
              <h2 className="font-display font-semibold text-ink">সোশ্যাল মিডিয়ায় আমরা</h2>
              <div className="mt-4 flex gap-3">
                {[
                  {
                    label: "ফেসবুক",
                    href: "https://www.facebook.com/share/1EZZ3afjqp/",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
                      </svg>
                    ),
                  },
                  {
                    label: "ইউটিউব",
                    href: "#",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.51 3.5 12 3.5 12 3.5s-7.51 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14C4.49 20.5 12 20.5 12 20.5s7.51 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.6 15.6V8.4l6.27 3.6-6.27 3.6Z" />
                      </svg>
                    ),
                  },
                  {
                    label: "হোয়াটসঅ্যাপ",
                    href: "https://wa.me/8801718523996",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
                      </svg>
                    ),
                  },
                ].map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target={href !== "#" ? "_blank" : undefined}
                    rel={href !== "#" ? "noopener noreferrer" : undefined}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/5 text-ink-soft hover:bg-ink/10"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
