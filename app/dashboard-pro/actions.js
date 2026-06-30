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

/**
 * Start a task: capture plate + service type, move the order to in_progress, and
 * deduct the parts used from inventory (with a movement log per part).
 * Allowed callers: admin, owning merchant, or the assigned technician.
 * Validates ALL parts (ownership + sufficient stock) BEFORE any write, so a bad
 * line item rejects the whole operation instead of partially applying.
 */
export async function startOrderWithParts(orderId, payload) {
  const { plate, serviceType, parts } = payload || {};
  if (!orderId) return { ok: false, error: 'مدخلات ناقصة' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  const { data: ord } = await admin.from('orders').select('id, merchant_id, assigned_to, branch_id').eq('id', orderId).maybeSingle();
  if (!ord) return { ok: false, error: 'الطلب غير موجود' };

  if (!(await isAdmin(supabase, user)) && ord.merchant_id !== user.id && ord.assigned_to !== user.id) {
    return { ok: false, error: 'لا تملك صلاحية على هذا الطلب' };
  }

  // Validate parts up front (ownership + stock) — no writes yet.
  const list = (Array.isArray(parts) ? parts : []).filter((p) => p && p.itemId && Number(p.qty) > 0);
  const toDeduct = [];
  if (list.length) {
    const { data: inv } = await admin
      .from('inventory')
      .select('id, name, quantity, merchant_id, branch_id')
      .in('id', list.map((p) => p.itemId));
    const byId = Object.fromEntries((inv || []).map((i) => [i.id, i]));
    for (const p of list) {
      const it = byId[p.itemId];
      const used = Number(p.qty);
      if (!it || it.merchant_id !== ord.merchant_id) return { ok: false, error: 'صنف غير صالح لهذا المركز' };
      if ((it.quantity || 0) < used) return { ok: false, error: `الكمية غير كافية: ${it.name}` };
      toDeduct.push({ it, used });
    }
  }

  const now = new Date().toISOString();
  const patch = { status: 'in_progress', started_at: now, updated_at: now };
  if (plate) patch.plate = plate;
  if (serviceType) patch.service_type = serviceType;

  const { error: oerr } = await admin.from('orders').update(patch).eq('id', orderId);
  if (oerr) return { ok: false, error: oerr.message };

  for (const { it, used } of toDeduct) {
    await admin.from('inventory').update({ quantity: Math.max(0, (it.quantity || 0) - used), updated_at: now }).eq('id', it.id);
    await admin.from('inventory_movements').insert({
      merchant_id: ord.merchant_id, item_id: it.id, type: 'out', quantity: used,
      notes: 'صرف على مهمة', branch_id: it.branch_id || ord.branch_id || null,
    });
  }

  revalidatePath('/dashboard-pro');
  return { ok: true, deducted: toDeduct.length };
}

/**
 * Quick-deduct parts against a task WITHOUT changing its status. Used by the
 * technician's "صرف سريع" row. Same auth gate + upfront stock validation as
 * startOrderWithParts. Allowed callers: admin, owning merchant, or assigned tech.
 */
export async function deductParts(orderId, parts) {
  if (!orderId) return { ok: false, error: 'مدخلات ناقصة' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  const { data: ord } = await admin.from('orders').select('id, merchant_id, assigned_to, branch_id').eq('id', orderId).maybeSingle();
  if (!ord) return { ok: false, error: 'الطلب غير موجود' };
  if (!(await isAdmin(supabase, user)) && ord.merchant_id !== user.id && ord.assigned_to !== user.id) {
    return { ok: false, error: 'لا تملك صلاحية على هذا الطلب' };
  }

  const list = (Array.isArray(parts) ? parts : []).filter((p) => p && p.itemId && Number(p.qty) > 0);
  if (!list.length) return { ok: false, error: 'لم تُحدّد أصناف' };

  const { data: inv } = await admin
    .from('inventory').select('id, name, quantity, merchant_id, branch_id')
    .in('id', list.map((p) => p.itemId));
  const byId = Object.fromEntries((inv || []).map((i) => [i.id, i]));
  const toDeduct = [];
  for (const p of list) {
    const it = byId[p.itemId];
    const used = Number(p.qty);
    if (!it || it.merchant_id !== ord.merchant_id) return { ok: false, error: 'صنف غير صالح لهذا المركز' };
    if ((it.quantity || 0) < used) return { ok: false, error: `الكمية غير كافية: ${it.name}` };
    toDeduct.push({ it, used });
  }

  const now = new Date().toISOString();
  for (const { it, used } of toDeduct) {
    await admin.from('inventory').update({ quantity: Math.max(0, (it.quantity || 0) - used), updated_at: now }).eq('id', it.id);
    await admin.from('inventory_movements').insert({
      merchant_id: ord.merchant_id, item_id: it.id, type: 'out', quantity: used,
      notes: 'صرف سريع', branch_id: it.branch_id || ord.branch_id || null,
    });
  }

  revalidatePath('/dashboard-pro');
  return { ok: true, deducted: toDeduct.length };
}

/**
 * Transfer a technician to another branch. Allowed callers: admin, or the merchant
 * who owns the worker's center. The target branch must belong to that same merchant.
 */
export async function transferWorkerBranch(workerUserId, branchId) {
  if (!workerUserId || !branchId) return { ok: false, error: 'مدخلات ناقصة' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  const { data: w } = await admin.from('workers').select('id, center_id').eq('user_id', workerUserId).maybeSingle();
  if (!w) return { ok: false, error: 'الفنّي غير موجود' };
  if (!(await isAdmin(supabase, user)) && w.center_id !== user.id) {
    return { ok: false, error: 'هذا الفنّي لا يتبع مركزك' };
  }

  // The target branch must belong to the worker's center (org isolation).
  const { data: b } = await admin.from('branches').select('id').eq('id', branchId).eq('owner_id', w.center_id).maybeSingle();
  if (!b) return { ok: false, error: 'الفرع غير صالح لهذا المركز' };

  const { error } = await admin.from('workers').update({ branch_id: branchId }).eq('user_id', workerUserId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard-pro');
  return { ok: true };
}

// ── Service CRUD (pricing engine) — merchant manages their own service_menu ──
async function ownsServiceOrAdmin(supabase, admin, user, serviceId) {
  if (await isAdmin(supabase, user)) return true;
  const { data: s } = await admin.from('service_menu').select('merchant_id').eq('id', serviceId).maybeSingle();
  return s && s.merchant_id === user.id;
}

export async function addService(name, price, category, stockCode) {
  if (!name?.trim()) return { ok: false, error: 'اسم الصنف مطلوب' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  const { data, error } = await admin.from('service_menu')
    .insert({ merchant_id: user.id, name: name.trim(), price: Number(price) || 0, category: category?.trim() || 'عام', stock_code: stockCode?.trim() || null, active: true })
    .select('id, name, price, category, stock_code, active').maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard-pro');
  revalidatePath('/dashboard/settings');
  return { ok: true, service: data };
}

export async function updateServiceStockCode(id, stockCode) {
  if (!id) return { ok: false, error: 'مدخلات ناقصة' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  if (!(await ownsServiceOrAdmin(supabase, admin, user, id))) return { ok: false, error: 'هذا الصنف لا يخصّ مركزك' };
  const { error } = await admin.from('service_menu').update({ stock_code: stockCode?.trim() || null }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/settings');
  return { ok: true };
}

export async function updateServicePrice(id, price) {
  if (!id) return { ok: false, error: 'مدخلات ناقصة' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  if (!(await ownsServiceOrAdmin(supabase, admin, user, id))) return { ok: false, error: 'هذه الخدمة لا تخصّ مركزك' };
  const { error } = await admin.from('service_menu').update({ price: Number(price) || 0 }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard-pro');
  return { ok: true };
}

export async function toggleService(id, active) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  if (!(await ownsServiceOrAdmin(supabase, admin, user, id))) return { ok: false, error: 'هذه الخدمة لا تخصّ مركزك' };
  const { error } = await admin.from('service_menu').update({ active: !!active }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard-pro');
  return { ok: true };
}

export async function deleteService(id) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  if (!(await ownsServiceOrAdmin(supabase, admin, user, id))) return { ok: false, error: 'هذه الخدمة لا تخصّ مركزك' };
  const { error } = await admin.from('service_menu').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard-pro');
  return { ok: true };
}
