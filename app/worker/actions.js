'use server';

/**
 * Worker-side server actions for the standalone cockpit.
 *
 * SECURITY MODEL: the magic token is redeemed for a REAL Supabase session, not a
 * hand-rolled cookie. So once logged in, the worker holds their own JWT
 * (app_metadata.role='technician', center_id, branch_id) and EVERY subsequent
 * action is protected by the exact same RLS as the rest of the app. There is no
 * parallel auth path and no service-role trust of a custom cookie.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isWellFormedToken, logWorkerActivity } from '@/lib/workerFleet';
import { updateOrderStatus } from '@/app/dashboard-pro/actions';

/**
 * Redeem a magic token → establish the worker's real Supabase session.
 * Single-use: the token is consumed on success. Fails closed for
 * missing/expired/blocked/deleted workers.
 */
export async function redeemWorkerToken(token) {
  const t = String(token || '').trim();
  if (!isWellFormedToken(t)) return { ok: false, error: 'رابط الدخول غير صالح' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'الخدمة غير مهيّأة' };

  // The token is looked up server-side only; it is never exposed to the client.
  const { data: worker } = await admin
    .from('workers')
    .select('id, center_id, email, full_name, status, access_token_expires_at')
    .eq('access_token', t)
    .maybeSingle();

  if (!worker) return { ok: false, error: 'رابط الدخول غير صالح أو مستخدَم' };
  if (worker.status !== 'active') return { ok: false, error: 'الحساب موقوف — تواصل مع المركز' };
  if (worker.access_token_expires_at && new Date(worker.access_token_expires_at) < new Date()) {
    return { ok: false, error: 'انتهت صلاحية رابط الدخول — اطلب رابطاً جديداً' };
  }
  if (!worker.email) return { ok: false, error: 'حساب العامل غير مكتمل' };

  // Establish a genuine session for the worker's existing auth user, without
  // their password: admin generateLink → verifyOtp writes the session cookies.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: worker.email,
  });
  const hashedToken = link?.properties?.hashed_token;
  if (linkErr || !hashedToken) return { ok: false, error: 'تعذّر إنشاء الجلسة' };

  const supabase = createServerSupabase();
  const { error: verifyErr } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken });
  if (verifyErr) return { ok: false, error: 'تعذّر تسجيل الدخول' };

  // Consume the token (single-use) and audit the login.
  await admin.from('workers').update({ access_token: null, access_token_expires_at: null }).eq('id', worker.id);
  await logWorkerActivity(admin, {
    workerId: worker.id, merchantId: worker.center_id, actionType: 'login',
    description: `تسجيل دخول ${worker.full_name || 'عامل'}`,
  });

  return { ok: true };
}

/**
 * Toggle an order's state from the cockpit. The mutation + authorization go
 * through the shared updateOrderStatus (RLS-safe: a worker may only touch orders
 * assigned to them). On success we append to the audit trail.
 */
export async function workerToggleOrder(orderId, newStatus) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'انتهت الجلسة — سجّل الدخول مجدداً' };

  const admin = getSupabaseAdmin();
  const { data: worker } = admin
    ? await admin.from('workers').select('id, center_id, full_name, status').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    : { data: null };
  if (!worker) return { ok: false, error: 'الحساب موقوف أو غير معروف' };

  const res = await updateOrderStatus(orderId, newStatus);
  if (!res?.ok) return res;

  const label = newStatus === 'in_progress' ? 'job_started'
    : newStatus === 'ready' ? 'job_ready'
    : newStatus === 'completed' ? 'job_completed' : 'job_update';
  const { data: ord } = await admin.from('orders').select('plate, customer_name').eq('id', orderId).maybeSingle();
  await logWorkerActivity(admin, {
    workerId: worker.id, merchantId: worker.center_id, actionType: label,
    description: `${worker.full_name || 'عامل'} · ${ord?.plate || ord?.customer_name || 'طلب'}`,
  });

  return { ok: true, fallback: res.fallback };
}

/** Clean session teardown for the cockpit's sign-out. */
export async function workerSignOut() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  return { ok: true };
}
