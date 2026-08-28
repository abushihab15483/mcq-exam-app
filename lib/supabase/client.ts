// Browser client — anon key, RLS enforced. Student side এ use হবে।
import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "./env";

export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
