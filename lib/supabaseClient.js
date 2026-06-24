'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

// Cookie-aware browser client (shared with the server via @supabase/ssr cookies),
// so sessions set on sign-in are readable by Server Components and middleware.
// Singleton to avoid creating multiple GoTrue instances on the client.
let _client;
export function getSupabaseBrowser() {
  if (!_client) _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// Back-compat: existing imports of `{ supabase }` keep working.
export const supabase = getSupabaseBrowser();
