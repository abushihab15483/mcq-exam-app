import Link from "next/link";

// Contact পেজের সাথে মিলিয়ে একই ফেসবুক/হোয়াটসঅ্যাপ লিংক — একটা জায়গায় বদলালে দুই
// জায়গাতেই আপডেট করতে হবে (আপাতত duplicate রাখা হলো, পরে চাইলে shared config এ সরানো যাবে)
const socialLinks = [
  {
    label: "ফেসবুক",
    href: "https://www.facebook.com/share/1EZZ3afjqp/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
      </svg>
    ),
  },
  {
    label: "হোয়াটসঅ্যাপ",
    href: "https://wa.me/8801718523996",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.17 8.17 0 0 1 2.41 5.82c0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.79.98-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-ink text-paper/80">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h5 className="font-display text-lg font-semibold text-paper">অংকুর জামালপুর শাখা</h5>
            <p className="mt-3 text-sm leading-relaxed text-paper/60">
              জামালপুরের শীর্ষস্থানীয় কোচিং সেন্টার — মানসম্মত শিক্ষা ও যত্নসহকারে পরীক্ষার প্রস্তুতি।
            </p>
          </div>

          <div>
            <h5 className="font-display text-sm font-semibold text-paper">কুইক লিংক</h5>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-paper/60">
              <li><Link href="/" className="hover:text-paper">হোম</Link></li>
              <li><Link href="/about" className="hover:text-paper">আমাদের সম্পর্কে</Link></li>
              <li><Link href="/live" className="hover:text-paper">লাইভ এক্সাম</Link></li>
              <li><Link href="/exam" className="hover:text-paper">পরীক্ষাসমূহ</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-display text-sm font-semibold text-paper">আরও</h5>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-paper/60">
              <li><Link href="/result" className="hover:text-paper">ফলাফল</Link></li>
              <li><Link href="/contact" className="hover:text-paper">যোগাযোগ</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-display text-sm font-semibold text-paper">যোগাযোগ</h5>
            <ul className="mt-3 flex flex-col gap-3 text-sm text-paper/60">
              <li>রেখা প্লাজা, পাঁচরাস্তা মোড়, জামালপুর</li>
              <li>০১৭১৮-৫২৩৯৯৬, ০১৬৭৫-২০৪১১৩</li>
              <li>almamunjamalpur@gmail.com</li>
            </ul>

            <div className="mt-4 flex gap-3">
              {socialLinks.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/10 text-paper/70 transition hover:bg-paper/20 hover:text-paper"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-paper/10 pt-6 text-center text-xs text-paper/50 sm:flex-row sm:text-left">
          <span>&copy; ২০২৬ অংকুর জামালপুর শাখা। সর্বস্বত্ব সংরক্ষিত।</span>
          <span>তৈরি করেছেন:- মোঃ আবু শিহাব</span>
        </div>
      </div>
    </footer>
  );
}
