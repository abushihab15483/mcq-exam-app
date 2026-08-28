// Server component / route handler client — anon key + cookies (admin session read).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "./env";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component থেকে render এর সময় cookie set করা যায় না —
            // middleware.ts আগেই session refresh/set করে দেয়, তাই এই error ignore করা নিরাপদ
          }
        },
      },
    }
  );
}
