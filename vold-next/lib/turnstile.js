/* ──────────────────────────────────────────────────────────────────────────
   Cloudflare Turnstile — client-safe helpers.

   The SECRET key NEVER appears here (or anywhere in the client bundle); the real
   siteverify call happens server-side in app/api/verify-turnstile/route.js.
   This module only exposes the PUBLIC site key and a thin fetch wrapper.
   ────────────────────────────────────────────────────────────────────────── */

// Public site key — safe to ship to the browser. Falls back to Cloudflare's
// official TEST site key (always issues a passing token) so dev works instantly.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

/**
 * Send the widget token to our own server route, which performs the authoritative
 * Cloudflare siteverify using the secret key. Returns { ok, status }.
 * A non-2xx (e.g. 403) or { ok:false } body both resolve to ok:false.
 */
export async function verifyTurnstile(token) {
  if (!token) return { ok: false, status: 400 };
  try {
    const res = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok === true, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
