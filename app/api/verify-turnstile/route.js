import { NextResponse } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   POST /api/verify-turnstile
   Authoritative server-side validation of a Cloudflare Turnstile token.

   The browser submits the widget's `cf-turnstile-response` token here; we relay it
   to Cloudflare's siteverify with our SECRET key (server-only). On any failure we
   return 403 Forbidden so the caller can block the auth attempt before it reaches
   Supabase. Tokens are single-use and expire ~5 min — Cloudflare enforces that.
   ────────────────────────────────────────────────────────────────────────── */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's official TEST secret (always passes). Override in prod via TURNSTILE_SECRET_KEY.
const TEST_SECRET = '1x0000000000000000000000000000000AA';

// Node runtime: fetch + URLSearchParams available; keeps the secret off the edge bundle.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const secret = process.env.TURNSTILE_SECRET_KEY || TEST_SECRET;

  let token = '';
  try {
    const body = await req.json();
    // Accept either { token } or the raw widget field name cf-turnstile-response.
    token = String(body?.token || body?.['cf-turnstile-response'] || '').trim();
  } catch {
    /* malformed body → treated as missing token below */
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing-token' }, { status: 403 });
  }

  const form = new URLSearchParams();
  form.append('secret', secret);
  form.append('response', token);
  const ip =
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '';
  if (ip) form.append('remoteip', ip);

  let outcome;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body: form });
    outcome = await res.json();
  } catch {
    // Cloudflare unreachable — fail closed.
    return NextResponse.json({ ok: false, error: 'verify-unavailable' }, { status: 403 });
  }

  if (!outcome?.success) {
    return NextResponse.json(
      { ok: false, error: 'verification-failed', codes: outcome?.['error-codes'] || [] },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}

// Anything other than POST is not allowed.
export async function GET() {
  return NextResponse.json({ ok: false, error: 'method-not-allowed' }, { status: 405 });
}
