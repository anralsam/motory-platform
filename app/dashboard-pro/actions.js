'use server';

/**
 * Server Actions for /dashboard-pro. All writes go through the service-role admin
 * client, but ONLY after a server-side authorization gate that cannot be bypassed
 * from the client.
 *
 * Data model (verified against the live DB):
 *   • orders.merchant_id  → the merchant's auth user id (users.id, role 'merchant')
 *   • orders.assigned_to  → the technician's auth user id (workers.user_id)
 *   • workers             → { user_id (auth), center_id (= merchant id), role, status }
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const ALLOWED = ['pending', 'in_progress', 'ready', 'completed'];
const STAMP = { in_progress: 'started_at', ready: 'ready_at', completed: 'completed_at' };
const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

async function isAdmin(supabase, user) {
  if (
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
  ) return true;
  const { data: urow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  return urow?.role === 'admin';
}

/**
 * Move an order through its lifecycle. Allowed callers:
 *   • an admin (any order), OR
 *   • the merchant who owns the order, OR
 *   • the technician the order is assigned to.
 */
export async function updateOrderStatus(orderId, newStatus) {
  if (!orderId || !ALLOWED.includes(newStatus)) return { ok: false, error: 'حالة غير صالحة' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  if (!(await isAdmin(supabase, user))) {
    const { data: ord } = await admin.from('orders').select('merchant_id, assigned_to').eq('id', orderId).maybeSingle();
    const owns = ord && (ord.merchant_id === user.id || ord.assigned_to === user.id);
    if (!owns) return { ok: false, error: 'لا تملك صلاحية على هذا الطلب' };
  }

  const now = new Date().toISOString();
  const patch = { status: newStatus, updated_at: now };
  if (STAMP[newStatus]) patch[STAMP[newStatus]] = now;

  const { error } = await admin.from('orders').update(patch).eq('id', orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard-pro');
  return { ok: true };
}

/**
 * Assign an order to a technician. Allowed callers:
 *   • an admin, OR
 *   • the merchant who owns the order.
 * The target worker must belong to the order's center (merchant) and be active.
 */
export async function assignOrderToWorker(orderId, workerUserId) {
  if (!orderId || !workerUserId) return { ok: false, error: 'مدخلات ناقصة' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  const { data: ord } = await admin.from('orders').select('id, merchant_id').eq('id', orderId).maybeSingle();
  if (!ord) return { ok: false, error: 'الطلب غير موجود' };

  // Caller must be admin or the owning merchant.
  if (!(await isAdmin(supabase, user)) && ord.merchant_id !== user.id) {
    return { ok: false, error: 'هذا الطلب لا يخصّ مركزك' };
  }

  // Target worker must belong to this center and be active (org isolation).
  const { data: w } = await admin
    .from('workers')
    .select('user_id')
    .eq('user_id', workerUserId)
    .eq('center_id', ord.merchant_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!w) return { ok: false, error: 'الفنّي لا يتبع هذا المركز' };

  const { error } = await admin
    .from('orders')
    .update({ assigned_to: workerUserId, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard-pro');
  return { ok: true };
}
