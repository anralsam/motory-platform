import { createClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY Supabase admin client (service-role).
 *
 * ⚠️  The service-role key bypasses RLS and grants full database access. It must
 *     NEVER reach the browser. Two safeguards:
 *       1. This module reads `process.env.SUPABASE_SERVICE_ROLE_KEY` — a
 *          non-public env var that Next.js strips from client bundles.
 *       2. It hard-refuses to initialize in a browser context.
 *
 * Only import this from Server Components / Route Handlers / Server Actions.
 * If the key isn't configured (e.g. not set in Vercel yet), this returns `null`
 * so callers can render the "No Data Available" UI instead of crashing.
 */
let _admin = null;

export function getSupabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin() must never run on the client.');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null; // env not configured → caller shows No-Data

  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
