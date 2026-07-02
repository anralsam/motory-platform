'use client';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

/* ──────────────────────────────────────────────────────────────────────────
   Single seam for the platform-commission payment flow.

   MVP  : manual bank transfer → merchant confirms → status 'VERIFYING'.
   LATER: when the commercial register + gateway (Moyasar / Tap / Stripe) is ready,
          replace `startCheckout()` with a createSession()+redirect — NOTHING else
          in the UI changes.
   ────────────────────────────────────────────────────────────────────────── */

// Platform bank details for the manual-transfer MVP (mock values).
export const PLATFORM_BANK = {
  bank: 'مصرف الراجحي — Al Rajhi Bank',
  accountName: 'VOLD MOTOR',
  iban: 'SA9880000000000000000000',
};

async function callWebhook(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + (session?.access_token || ''),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && !!data.ok, error: data.error || null, data };
}

/**
 * The one function to swap when going live with a card gateway.
 * Today: marks the dues as a submitted bank transfer (→ VERIFYING).
 * Future: `return createGatewaySession(billing).then(s => { location.href = s.url })`.
 */
export async function startCheckout(billing) {
  if (!billing?.id) return { ok: false, error: 'no billing record' };
  return callWebhook({ billing_id: billing.id, status: 'verifying' });
}

/** Confirm a real payment (used by the gateway webhook / admin verification → PAID). */
export async function confirmPayment(billingId, transactionId) {
  return callWebhook({ billing_id: billingId, transaction_id: transactionId, status: 'paid' });
}

/* ── Apple Pay via Moyasar hosted checkout (activates when the key is set) ── */

/** True once the Moyasar publishable key is present in the environment. */
export function gatewayConfigured() {
  return !!process.env.NEXT_PUBLIC_MOYASAR_PK;
}

/** Client feature-detection: is Apple Pay usable on this device/browser? */
export function applePayAvailable() {
  if (typeof window === 'undefined') return false;
  try {
    return !!(window.ApplePaySession && typeof window.ApplePaySession.canMakePayments === 'function' && window.ApplePaySession.canMakePayments());
  } catch {
    return false;
  }
}

/**
 * Begin an Apple Pay payment for the dues via the Moyasar hosted page.
 * Degrades gracefully: returns { ok:false } (never throws) when the gateway isn't
 * configured yet, so the UI can fall back to the manual bank-transfer flow.
 */
export async function startApplePay(billing) {
  if (!gatewayConfigured()) return { ok: false, reason: 'gateway_unconfigured' };
  if (!billing?.id || !(Number(billing.total_amount) > 0)) return { ok: false, reason: 'no_amount' };
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    // Moyasar hosted checkout (redirect flow); the payment-webhook confirms → PAID.
    const url = `https://api.moyasar.com/v1/payment_form`
      + `?publishable_api_key=${encodeURIComponent(process.env.NEXT_PUBLIC_MOYASAR_PK)}`
      + `&amount=${Math.round(Number(billing.total_amount) * 100)}`
      + `&currency=SAR&description=${encodeURIComponent('VOLD MOTOR — عمولة المنصة')}`
      + `&callback_url=${encodeURIComponent(`${base}/dashboard/checkout-success?billing=${billing.id}`)}`
      + `&methods=applepay`;
    window.location.href = url;
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
