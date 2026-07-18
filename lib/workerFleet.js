import 'server-only';
import crypto from 'node:crypto';

/**
 * Shared server-only helpers for the Secure Worker Fleet & Access Hub.
 * No React, no client imports — pure server logic used by the fleet + worker
 * server actions.
 */

// Crockford-ish base32 (no I/L/O/U to avoid look-alikes) for human-legible tokens.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * A single-use magic-login token: VOLD-W-XXXXXXXXXXXXXXXXXXXX.
 * ~20 random base32 chars (~100 bits) — a short-lived, single-use credential, so
 * this is far more than enough while staying copy-pasteable.
 */
export function generateAccessToken() {
  const bytes = crypto.randomBytes(20);
  let out = '';
  for (let i = 0; i < 20; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `VOLD-W-${out}`;
}

/** Invite links are valid for 7 days or until first use, whichever comes first. */
export const ACCESS_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A magic token must look like ours before we ever hit the database with it. */
export function isWellFormedToken(token) {
  return typeof token === 'string' && /^VOLD-W-[0-9A-Z]{20}$/.test(token.trim());
}

/**
 * Append one row to the worker_activities audit trail. BEST-EFFORT: never throws
 * and never blocks the caller's critical path — an audit write must not be able
 * to fail a job toggle. `admin` is a service-role client.
 */
export async function logWorkerActivity(admin, { workerId, merchantId, actionType, description }) {
  if (!admin || !merchantId || !actionType) return;
  try {
    await admin.from('worker_activities').insert({
      worker_id: workerId || null,
      merchant_id: merchantId,
      action_type: actionType,
      description: description || null,
    });
  } catch {
    /* audit is best-effort */
  }
}
