import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db.types";

// Server-only client using the service role key. Never import this file
// from a "use client" component — it must only run in route handlers /
// server components, since the service role key bypasses RLS entirely.
let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

export function supabaseAdmin() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
  }

  cachedClient = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
