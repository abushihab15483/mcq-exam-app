"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

// Supabase Auth দিয়ে admin login। Admin user Supabase Dashboard > Authentication
// > Users এ গিয়ে নিজে বানাতে হবে (email+password) — README এ ধাপ দেওয়া আছে।
export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("লগইন ব্যর্থ হয়েছে। ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="অ্যাডমিন লগইন ফর্ম">
      <Input
        label="ইমেইল"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <Input
        label="পাসওয়ার্ড"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "লগইন হচ্ছে..." : "লগইন করো"}
      </Button>
    </form>
  );
}
