'use server';

/**
 * Server Actions for /dashboard-pro.
 *
 * updateOrderStatus — moves a workshop order through its lifecycle
 * (pending → in_progress → ready → completed). Security model:
 *   1. Validate the requested status against an allow-list.
 *   2. Authorize the caller server-side (must be a signed-in ADMIN). This runs
 *      on the server, so the gate cannot be bypassed from the client.
 *   3. Only then perform the write with the service-role admin client.
 *
 * NOTE: this updates `orders` (the technician job table), NOT `join_requests`
 * (merchant onboarding) — those are different domains with different statuses.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const ALLOWED = ['pending', 'in_progress', 'ready', 'completed'];
const STAMP = { in_progress: 'started_at', ready: 'ready_at', completed: 'completed_at' };
const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

export async function updateOrderStatus(orderId, newStatus) {
  // 1) Validate input
  if (!orderId || !ALLOWED.includes(newStatus)) {
    return { ok: false, error: 'حالة غير صالحة' };
  }

  // 2) Authorize: signed-in admin only
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  let isAdmin =
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    const { data: urow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
    isAdmin = urow?.role === 'admin';
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  // 3) Ownership check: admins may update any order; a merchant may only update
  //    their OWN orders (orders.merchant_id === their user id).
  if (!isAdmin) {
    const { data: ord } = await admin.from('orders').select('merchant_id').eq('id', orderId).maybeSingle();
    if (!ord || ord.merchant_id !== user.id) {
      return { ok: false, error: 'هذا الطلب لا يخصّ حسابك' };
    }
  }

  const now = new Date().toISOString();
  const patch = { status: newStatus, updated_at: now };
  if (STAMP[newStatus]) patch[STAMP[newStatus]] = now;

  const { error } = await admin.from('orders').update(patch).eq('id', orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard-pro');
  return { ok: true };
}
