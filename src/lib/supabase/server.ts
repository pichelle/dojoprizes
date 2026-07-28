import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

// Server-only client. Everything in this app runs as a Server Component or
// Server Action, so these env vars are never bundled to the browser -- no
// NEXT_PUBLIC_ prefix needed, and the anon key never reaches client code.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// There's no per-user Supabase Auth (single shared staff login, handled by
// the password gate in middleware.ts), so we use the anon key everywhere
// and rely on the RLS policies in supabase/schema.sql, which intentionally
// allow full read/write for this internal, gated app.
export function createServerClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
