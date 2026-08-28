// Service-role client — FULL DB access, bypasses RLS. Server-only. NEVER import in client components.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}
