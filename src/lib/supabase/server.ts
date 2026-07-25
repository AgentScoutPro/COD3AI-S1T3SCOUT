import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Service-role client for server-only code paths (API routes, orchestrator,
// the standalone seed script). Bypasses RLS by design — every caller in
// this codebase is responsible for its own authorization checks before
// touching organization-scoped data. Deliberately does not import
// "server-only": that package unconditionally throws outside Next's own
// webpack bundler, which breaks this module's legitimate use from
// scripts/seed.ts (plain tsx, no Next bundler involved).
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY (see .env.example)."
    );
  }

  cached = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
