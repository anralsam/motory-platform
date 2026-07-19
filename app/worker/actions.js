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
import { revalidatePath } from 'next/cache';

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
  const { data: ord } = await admin.from('orders').select('plate, customer_name, started_at, ready_at, completed_at').eq('id', orderId).maybeSingle();
  // Stage duration for this transition: production (ready−started) on «جاهزة»,
  // handover (completed−ready) on «تم التسليم».
  const mins = (a, b) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 60000 : null);
  const durationMin = newStatus === 'ready' ? mins(ord?.started_at, ord?.ready_at)
    : newStatus === 'completed' ? mins(ord?.ready_at, ord?.completed_at) : null;
  await logWorkerActivity(admin, {
    workerId: worker.id, merchantId: worker.center_id, actionType: label,
    description: `${worker.full_name || 'عامل'} · ${ord?.plate || ord?.customer_name || 'طلب'}`,
    durationMin,
  });

  return { ok: true, fallback: res.fallback };
}

// Saudi phone → international digits (no +). Server-authoritative; the client
// only formats for display.
function canonPhone(p) {
  let s = String(p || '').replace(/\D/g, '');
  if (s.startsWith('00966')) return s.slice(2);
  if (s.startsWith('966')) return s;
  if (s.startsWith('0')) return '966' + s.slice(1);
  if (s.length === 9 && s.startsWith('5')) return '966' + s;
  return s;
}

/**
 * Atomic order intake from the shop floor. Tenancy is injected SERVER-SIDE from
 * the worker's trusted, ACTIVE workers row — center_id, branch_id and the creator
 * (assigned_to) can never be forged by the client. Pricing is read from the
 * center's service_menu, so the "fixed price" is enforced, not trusted from the
 * form. Inserts through the service-role client because technicians have no RLS
 * INSERT on orders by design.
 */
export async function createWorkerOrder(form = {}) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'انتهت الجلسة — سجّل الدخول مجدداً' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'الخدمة غير مهيّأة' };

  // is_active gating: an ACTIVE row is required for any write. A blocked/deleted
  // worker fails here even mid-session.
  const { data: worker } = await admin
    .from('workers')
    .select('id, center_id, branch_id, full_name, status')
    .eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!worker) return { ok: false, error: 'الحساب موقوف — تواصل مع المركز' };

  const plate = String(form.plate || '').trim();
  if (!plate) return { ok: false, error: 'رقم اللوحة مطلوب' };
  const customerName = String(form.customerName || '').trim() || null;
  const customerPhone = form.customerPhone ? canonPhone(form.customerPhone) : null;
  const carModel = String(form.carModel || '').trim() || null;

  // Service + FIXED price resolved from the menu (never from the client).
  let serviceType = String(form.serviceType || '').trim() || null;
  let price = null;
  if (form.serviceId) {
    const { data: svc } = await admin
      .from('service_menu').select('name, price')
      .eq('id', form.serviceId).eq('merchant_id', worker.center_id).eq('active', true).maybeSingle();
    if (!svc) return { ok: false, error: 'الخدمة غير متاحة في هذا المركز' };
    serviceType = svc.name;
    price = Number(svc.price) || 0;
  }

  const status = form.startNow ? 'in_progress' : 'pending';
  const now = new Date().toISOString();
  const row = {
    merchant_id: worker.center_id,   // injected — tenancy isolation
    branch_id: worker.branch_id,     // injected from the worker's branch
    assigned_to: user.id,            // creator = this worker
    plate, car_model: carModel, customer_name: customerName, customer_phone: customerPhone,
    service_type: serviceType, price,
    status, updated_at: now,
    ...(status === 'in_progress' ? { started_at: now } : {}),
  };

  const { data: order, error } = await admin
    .from('orders')
    .insert(row)
    .select('id, customer_name, customer_phone, car_make, car_model, plate, service_type, status, price, created_at, started_at')
    .single();
  if (error) return { ok: false, error: error.message };

  await logWorkerActivity(admin, {
    workerId: worker.id, merchantId: worker.center_id, actionType: 'order_created',
    description: `${worker.full_name || 'عامل'} · ${plate}${serviceType ? ' · ' + serviceType : ''}`,
  });

  revalidatePath('/worker/dashboard');
  return { ok: true, order };
}

/** Clean session teardown for the cockpit's sign-out. */
export async function workerSignOut() {
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  return { ok: true };
}
