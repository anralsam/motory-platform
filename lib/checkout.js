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
