// Single source of truth for the Supabase connection (safe to import from
// client, server, and middleware). Values come ONLY from environment variables:
//   • locally → .env.local
//   • on Vercel → project env (also mirrored in vercel.json)
// The anon key is public by design (it ships in the client bundle); the secret
// service-role key is never referenced here.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local locally, Vercel project env in production).'
  );
}
