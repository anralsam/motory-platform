'use client';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

// Where workers actually sign in. Point at this app's login (change to the live
// vanilla login if workers should use that instead).
export const WORKER_LOGIN_URL =
  (typeof window !== 'undefined' ? window.location.origin : 'https://app.voldmotor.com') + '/auth/signin';

const EDGE_URL = SUPABASE_URL + '/functions/v1';
const WORKER_EMAIL_DOMAIN = '@workers.voldmotor.com';

// Pseudo-email auth bridge: phone → login email, PIN → deterministic auth password.
export function workerEmail(phone) {
  return waNormalize(phone) + WORKER_EMAIL_DOMAIN;
}
export function workerPassword(pin) {
  return 'vm' + String(pin || '').trim();
}

// Calls the create-worker edge function to provision a REAL Supabase Auth user
// (pseudo-email + PIN) and insert the staff row. Returns { worker } or { error }.
export async function createWorker(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'انتهت الجلسة، سجّل الدخول مجدداً' };
  let res, j;
  try {
    res = await fetch(EDGE_URL + '/create-worker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + session.access_token,
      },
      body: JSON.stringify(payload),
    });
    j = await res.json().catch(() => ({ error: 'تعذّر قراءة الرد' }));
  } catch (e) {
    return { error: 'تعذّر الاتصال بالخادم' };
  }
  if (!res.ok || j.error) return { error: j.error || 'تعذّر إنشاء الحساب' };
  return { worker: j.worker };
}

// Normalize a Saudi phone to international form for wa.me (no +).
export function waNormalize(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (!p) return '';
  if (p.startsWith('00966')) return p.slice(2);
  if (p.startsWith('966')) return p;
  if (p.startsWith('0')) return '966' + p.slice(1);
  if (p.length === 9 && p.startsWith('5')) return '966' + p;
  return p;
}

export function genPin() {
  // 6-digit PIN (1,000,000 combinations) — harder to brute-force than 4 digits.
  // Uses crypto when available for unbiased randomness.
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return String(100000 + (a[0] % 900000));
  } catch (e) {
    return String(100000 + Math.floor(Math.random() * 900000));
  }
}

// Stable per-worker PIN for the session/device so "send link" is repeatable.
export function pinFor(id) {
  try {
    let p = localStorage.getItem('vm_worker_pin_' + id);
    if (!p) { p = genPin(); localStorage.setItem('vm_worker_pin_' + id, p); }
    return p;
  } catch (e) {
    return genPin();
  }
}
export function setPin(id, pin) {
  try { localStorage.setItem('vm_worker_pin_' + id, pin); } catch (e) {}
}

export function buildLoginMessage(worker, pin) {
  return (
    `مرحباً ${worker.full_name || ''}، تم إضافة حسابك في نظام VOLD MOTOR.\n` +
    `رابط الدخول: ${WORKER_LOGIN_URL}\n` +
    `رقم الجوال: ${worker.phone || ''}\n` +
    `الرمز السري: ${pin}`
  );
}

export function whatsappLink(worker, pin) {
  const num = waNormalize(worker.phone);
  const text = encodeURIComponent(buildLoginMessage(worker, pin));
  return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
}
