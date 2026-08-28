"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

// আগে এখানে কোনো backend ছিল না — সাবমিট করলে শুধু client-side "পাঠানো হয়েছে"
// দেখাত, মেসেজ কোথাও সেভ হতো না। এখন app/api/contact/route.ts কল করে
// contact_messages টেবিলে আসল সেভ হয় (দেখো supabase/step17-contact-messages.sql),
// admin (public)/messages পেজ থেকে পড়া যায়।
export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      full_name: String(formData.get("full_name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "মেসেজ পাঠাতে সমস্যা হয়েছে, একটু পর আবার চেষ্টা করো");
        return;
      }

      form.reset();
      setSent(true);
    } catch {
      setError("ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card border border-border bg-white p-6 shadow-sm sm:p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
        <div className="text-4xl">✅</div>
        <h3 className="font-display text-lg font-semibold text-ink">মেসেজ পাঠানো হয়েছে</h3>
        <p className="text-sm text-ink-soft">
          তোমার মেসেজের জন্য ধন্যবাদ। আমরা যত দ্রুত সম্ভব যোগাযোগ করব।
        </p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>
          আরেকটি মেসেজ পাঠাও
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-border bg-white p-6 shadow-sm sm:p-8"
    >
      <h3 className="font-display text-lg font-semibold text-ink">মেসেজ পাঠান</h3>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-card border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input name="full_name" label="পূর্ণ নাম" placeholder="যেমন: রফিকুল ইসলাম" required minLength={2} />
        <Input
          name="phone"
          label="মোবাইল নম্বর"
          type="tel"
          placeholder="যেমন: ০১৭XXXXXXXX"
          required
          pattern="^01[3-9]\d{8}$"
          title="সঠিক ১১ ডিজিটের বাংলাদেশি ফোন নাম্বার দাও (যেমন: 01712345678)"
        />
        <div className="sm:col-span-2">
          <Input name="email" label="ইমেইল ঠিকানা (ঐচ্ছিক)" type="email" placeholder="যেমন: example@mail.com" />
        </div>
        <div className="sm:col-span-2">
          <Input name="subject" label="বিষয় (ঐচ্ছিক)" placeholder="যেমন: ভর্তি সংক্রান্ত জিজ্ঞাসা" />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label htmlFor="message" className="text-sm font-medium text-ink-soft">মেসেজ</label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            minLength={5}
            placeholder="তোমার প্রশ্ন বা মন্তব্য এখানে লেখো..."
            className="rounded-card border border-border bg-paper px-4 py-2.5 text-ink font-body placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" disabled={submitting}>
            {submitting ? "পাঠানো হচ্ছে..." : "মেসেজ পাঠান"}
          </Button>
        </div>
      </div>
    </form>
  );
}
