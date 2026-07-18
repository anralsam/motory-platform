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
import { sendAutomatedWhatsApp } from '@/lib/whatsapp';
import { revalidatePath } from 'next/cache';

const ALLOWED = ['pending', 'in_progress', 'ready', 'completed'];
const STAMP = { in_progress: 'started_at', ready: 'ready_at', completed: 'completed_at' };
const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voldmotor.com';
// Order status → automation trigger. (ready & completed both notify "ready for pickup".)
const STATUS_TRIGGER = { in_progress: 'job_start', ready: 'job_ready', completed: 'job_ready' };

async function isAdmin(supabase, user) {
  // SECURITY: never trust user_metadata.role — it is client-writable via
  // supabase.auth.updateUser({ data }). Only the @voldmotor.com email, the
  // service-role-only app_metadata.role, and the DB users.role column are trusted.
  if (
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin'
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

  // Commit the status transition first — this is the critical path, never blocked.
  const { error } = await admin.from('orders').update(patch).eq('id', orderId);
  if (error) return { ok: false, error: error.message };

  // Gated, server-side WhatsApp Cloud API dispatch (best-effort). `fallback:true`
  // tells the worker screen to render the manual wa.me safety-net button instead.
  let fallback = true;
  const trigger = STATUS_TRIGGER[newStatus];
  if (trigger) {
    const { data: o } = await admin.from('orders')
      .select('customer_name, customer_phone, plate, merchant_id').eq('id', orderId).maybeSingle();
    const { data: auto } = o?.merchant_id
      ? await admin.from('whatsapp_automations').select('*').eq('merchant_id', o.merchant_id).maybeSingle()
      : { data: null };
    const triggerOn = !auto || auto[trigger] !== false; // default ON
    if (triggerOn && o?.customer_phone) {
      if (auto?.use_fallback_links === true) {
        fallback = true; // center opted into manual links
      } else {
        const res = await sendAutomatedWhatsApp(o.customer_phone, trigger, {
          customer_name: o.customer_name || 'عميلنا',
          vehicle_plate: o.plate || '',
          short_receipt_url: `${SITE_URL}/receipt/${orderId}`,
        });
        fallback = res.fallback !== false; // cloud send failed/unconfigured → manual
      }
    } else {
      fallback = false; // trigger off or no phone → nothing to send, no manual button
    }
  } else {
    fallback = false;
  }

  revalidatePath('/dashboard-pro');
  revalidatePath('/dashboard');
  return { ok: true, fallback };
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

export async function addService(name, price, category, stockCode, branchId = null) {
  if (!name?.trim()) return { ok: false, error: 'اسم الصنف مطلوب' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  // Resolve a CONCRETE branch. Inserting with branch_id NULL made every service
  // created from the "all branches" view invisible in every branch-specific
  // settings tab. A caller-supplied branch is honoured only if the caller owns it.
  let resolved = null;
  if (branchId && branchId !== 'all') {
    const { data: br } = await admin.from('branches').select('id').eq('id', branchId).eq('owner_id', user.id).maybeSingle();
    resolved = br?.id || null;
  }
  if (!resolved) {
    const { data: brs } = await admin.from('branches').select('id, is_primary').eq('owner_id', user.id);
    resolved = (brs || []).find((b) => b.is_primary)?.id || (brs || [])[0]?.id || null;
  }

  const { data, error } = await admin.from('service_menu')
    .insert({ merchant_id: user.id, branch_id: resolved, name: name.trim(), price: Number(price) || 0, category: category?.trim() || 'عام', stock_code: stockCode?.trim() || null, active: true })
    .select('id, name, price, category, stock_code, active, branch_id').maybeSingle();
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

// ── Platform governance — Super-Admin lifecycle controls over a merchant/center ──
const TIER_PLANS = ['standard', 'enterprise'];

async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'غير مصرّح' };
  if (!(await isAdmin(supabase, user))) return { error: 'هذه العملية للمشرف العام فقط' };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'مفتاح الخدمة غير مهيّأ' };
  return { admin };
}

function revalidateAdmin() {
  revalidatePath('/dashboard-pro');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard');
}

export async function toggleMerchantFreeze(merchantId, status) {
  if (!merchantId) return { ok: false, error: 'مدخلات ناقصة' };
  const { admin, error } = await requireAdmin();
  if (error) return { ok: false, error };
  const { error: e } = await admin.from('users').update({ is_frozen: !!status, updated_at: new Date().toISOString() }).eq('id', merchantId);
  if (e) return { ok: false, error: e.message };
  revalidateAdmin();
  return { ok: true, is_frozen: !!status };
}

export async function toggleMerchantAudit(merchantId, status) {
  if (!merchantId) return { ok: false, error: 'مدخلات ناقصة' };
  const { admin, error } = await requireAdmin();
  if (error) return { ok: false, error };
  const { error: e } = await admin.from('users').update({ under_audit: !!status, updated_at: new Date().toISOString() }).eq('id', merchantId);
  if (e) return { ok: false, error: e.message };
  revalidateAdmin();
  return { ok: true, under_audit: !!status };
}

export async function resetMerchantTier(merchantId, tierPackage) {
  if (!merchantId || !TIER_PLANS.includes(tierPackage)) return { ok: false, error: 'باقة غير صالحة' };
  const { admin, error } = await requireAdmin();
  if (error) return { ok: false, error };
  const { error: e } = await admin.from('users').update({ tier_plan: tierPackage, updated_at: new Date().toISOString() }).eq('id', merchantId);
  if (e) return { ok: false, error: e.message };
  revalidateAdmin();
  return { ok: true, tier_plan: tierPackage };
}

// ── Granular staff permissions — owner toggles their workers' access keys ──
const PERMISSION_KEYS = ['can_view_financials', 'can_manage_catalog', 'can_transfer_staff'];

export async function setWorkerPermission(workerUserId, key, value) {
  if (!workerUserId || !PERMISSION_KEYS.includes(key)) return { ok: false, error: 'مدخلات غير صالحة' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  const { data: w } = await admin.from('workers').select('center_id').eq('user_id', workerUserId).maybeSingle();
  if (!w) return { ok: false, error: 'الموظف غير موجود' };
  if (!(await isAdmin(supabase, user)) && w.center_id !== user.id) return { ok: false, error: 'هذا الموظف لا يتبع مركزك' };
  const { error } = await admin.from('workers').update({ [key]: !!value }).eq('user_id', workerUserId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard-pro');
  return { ok: true };
}

// ── WhatsApp automation triggers — merchant toggles their own row ──
const AUTOMATION_KEYS = ['welcome', 'job_start', 'job_ready', 'invoice', 'campaigns', 'use_fallback_links'];

export async function setAutomation(key, enabled) {
  if (!AUTOMATION_KEYS.includes(key)) return { ok: false, error: 'مفتاح غير صالح' };
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };
  // Row is keyed by the merchant's own id, so a merchant can only edit their own.
  const { error } = await admin
    .from('whatsapp_automations')
    .upsert({ merchant_id: user.id, [key]: !!enabled, updated_at: new Date().toISOString() }, { onConflict: 'merchant_id' });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dashboard/settings');
  return { ok: true };
}

export async function getCentersLive() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(supabase, user))) return { ok: false, error: 'غير مصرّح' };
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  const [{ data: orders }, { data: workers }, { data: users }, billingRes, { data: branchRows }] = await Promise.all([
    admin.from('orders')
      .select('id, merchant_id, customer_name, plate, service_type, status, price, created_at, started_at, completed_at, assigned_to')
      .order('created_at', { ascending: false }).limit(600),
    admin.from('workers').select('*').order('created_at', { ascending: false }).limit(200)
      .then((r) => (r.error ? admin.from('workers').select('*').limit(200) : r)),
    admin.from('users').select('id, shop_name, is_frozen, under_audit').eq('role', 'merchant'),
    admin.from('platform_billing').select('*').limit(120)
      .then((r) => (r.error ? { data: [] } : r)),
    admin.from('branches').select('id, owner_id, center_type, is_primary'),
  ]);

  // نوع النشاط لكل مركز — من فرعه الرئيسي (أو أول فرع)
  const typeByOwner = {};
  const branchCountByOwner = {};
  (branchRows || []).forEach((b) => {
    branchCountByOwner[b.owner_id] = (branchCountByOwner[b.owner_id] || 0) + 1;
    if (!typeByOwner[b.owner_id] || b.is_primary) typeByOwner[b.owner_id] = b.center_type || 'أخرى';
  });

  const nameById = Object.fromEntries((users || []).map((u) => [u.id, u.shop_name || 'مركز']));
  const workerName = Object.fromEntries((workers || []).filter((w) => w.user_id).map((w) => [w.user_id, w.full_name]));

  // ── Per-center consolidation ──
  const centers = {};
  const centerOf = (id) => {
    if (!centers[id]) {
      centers[id] = {
        id, name: nameById[id] || 'مركز',
        type: typeByOwner[id] || 'أخرى',
        branchCount: branchCountByOwner[id] || 0,
        frozen: !!(users || []).find((u) => u.id === id)?.is_frozen,
        audit: !!(users || []).find((u) => u.id === id)?.under_audit,
        live: 0, pending: 0, todayOps: 0, todayRevenue: 0, completedToday: 0,
        ops: [], hires: [], transfers: [],
      };
    }
    return centers[id];
  };
  (users || []).forEach((u) => centerOf(u.id));

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  (orders || []).forEach((o) => {
    if (!o.merchant_id) return;
    const c = centerOf(o.merchant_id);
    if (o.status === 'in_progress' || o.status === 'ready') c.live += 1;
    if (o.status === 'pending') c.pending += 1;
    const t = o.created_at ? new Date(o.created_at) : null;
    if (t && t >= dayStart) {
      c.todayOps += 1;
      if (o.status === 'completed') c.todayRevenue += Number(o.price) || 0;
    }
    if (o.status === 'completed') {
      const ct = o.completed_at || o.created_at;
      if (ct && new Date(ct) >= dayStart) c.completedToday += 1;
    }
    if (c.ops.length < 8) c.ops.push({
      id: o.id, customer: o.customer_name || 'عميل', plate: o.plate || null,
      service: o.service_type || 'خدمة', status: o.status, price: Number(o.price) || 0,
      tech: o.assigned_to ? (workerName[o.assigned_to] || 'فنّي') : null,
      at: o.completed_at || o.started_at || o.created_at,
    });
  });

  (workers || []).forEach((w) => {
    if (!w.center_id) return;
    const c = centerOf(w.center_id);
    if (c.hires.length < 6) c.hires.push({
      name: w.full_name || 'موظف', status: w.status || '—', at: w.created_at || null,
    });
  });

  (billingRes.data || []).forEach((b) => {
    const id = b.merchant_id || b.center_id;
    if (!id) return;
    const c = centerOf(id);
    if (c.transfers.length < 6) c.transfers.push({
      period: b.billing_period || '—',
      amount: Number(b.amount_due ?? b.amount ?? b.total ?? b.commission_due ?? 0) || 0,
      status: b.status || (b.paid_at || b.is_paid ? 'paid' : 'due'),
      at: b.paid_at || b.updated_at || b.created_at || null,
    });
  });

  const rows = Object.values(centers).sort((a, b) => (b.live + b.pending) - (a.live + a.pending) || b.todayOps - a.todayOps);
  const todayOrders = (orders || [])
    .filter((o) => o.created_at && new Date(o.created_at) >= dayStart)
    .map((o) => ({ merchant_id: o.merchant_id, status: o.status, price: Number(o.price) || 0, hour: new Date(o.created_at).getHours() }));
  return { ok: true, at: new Date().toISOString(), centers: rows, todayOrders };
}

/* ═══════════════════════════════════════════════════════════════════════════
   OPEX — Expense & Net Profit engine
   Expenses are an OWNER-level financial record. Unlike orders (which technicians
   also touch), there is no delegated path here: the only authorized writer is the
   merchant who owns the row, or a platform admin. Every id that arrives from the
   client is re-checked against the session server-side before any write.
   ═══════════════════════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES = ['salaries', 'rent', 'utilities', 'government_fees', 'inventory_purchase', 'miscellaneous'];

/**
 * Log a new operating expense.
 * @param {{title:string, amount:number|string, category:string, branchId?:string|null, expenseDate?:string, receiptUrl?:string|null}} data
 * @returns {Promise<{ok:boolean, expense?:object, error?:string}>}
 */
export async function addExpense(data = {}) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  // ── Localized input validation ──
  const title = String(data.title || '').trim();
  if (!title) return { ok: false, error: 'عنوان المصروف مطلوب' };
  if (title.length > 160) return { ok: false, error: 'عنوان المصروف طويل جداً' };

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: 'أدخل مبلغاً صحيحاً' };
  if (amount > 99999999.99) return { ok: false, error: 'المبلغ يتجاوز الحد المسموح' };

  const category = String(data.category || 'miscellaneous');
  if (!EXPENSE_CATEGORIES.includes(category)) return { ok: false, error: 'تصنيف غير معروف' };

  const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date();
  if (Number.isNaN(expenseDate.getTime())) return { ok: false, error: 'تاريخ غير صالح' };

  // ── Ownership: a branch may only be attached if it belongs to THIS merchant ──
  let branchId = data.branchId && data.branchId !== 'all' ? String(data.branchId) : null;
  if (branchId) {
    const { data: br } = await admin.from('branches').select('id').eq('id', branchId).eq('owner_id', user.id).maybeSingle();
    if (!br) return { ok: false, error: 'الفرع غير موجود أو لا تملكه' };
  }

  const { data: row, error } = await admin
    .from('expenses')
    .insert({
      merchant_id: user.id,           // NEVER from the client
      branch_id: branchId,
      title,
      // Legacy mirror: the pre-existing table carries a `description` column that
      // the old vanilla page used as the label. Writing both keeps that surface
      // (and any NOT NULL restored on it) working alongside the new `title`.
      description: title,
      amount: Math.round(amount * 100) / 100,
      category,
      expense_date: expenseDate.toISOString(),
      receipt_url: data.receiptUrl ? String(data.receiptUrl).trim() : null,
    })
    .select('id, merchant_id, branch_id, title, amount, category, expense_date, receipt_url, created_at')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  return { ok: true, expense: row };
}

/**
 * Permanently remove an expense. Only its owner (or a platform admin) may delete.
 * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
 */
export async function deleteExpense(expenseId) {
  if (!expenseId) return { ok: false, error: 'معرّف المصروف مفقود' };

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'غير مصرّح — سجّل الدخول' };

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'مفتاح الخدمة غير مهيّأ' };

  // Re-verify ownership server-side — the client-supplied id proves nothing.
  const { data: row } = await admin.from('expenses').select('merchant_id').eq('id', expenseId).maybeSingle();
  if (!row) return { ok: false, error: 'المصروف غير موجود' };
  if (row.merchant_id !== user.id && !(await isAdmin(supabase, user))) {
    return { ok: false, error: 'لا تملك صلاحية على هذا المصروف' };
  }

  const { error } = await admin.from('expenses').delete().eq('id', expenseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/dashboard');
  return { ok: true, id: expenseId };
}
