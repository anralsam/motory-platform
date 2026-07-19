'use server';

/**
 * Owner-side server actions for the Secure Worker Fleet & Access Hub.
 *
 * Every action authenticates the caller, then authorizes: the caller must OWN the
 * worker's center (worker.center_id === caller.id) or be a platform admin. The
 * worker id from the client is always re-checked against the DB — a client id
 * proves nothing on its own. All writes go through the service-role client only
 * after that gate.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/platformAdmin';
import { generateAccessToken, ACCESS_TOKEN_TTL_MS, logWorkerActivity } from '@/lib/workerFleet';
import { revalidatePath } from 'next/cache';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voldmotor.com';

/** Load the caller + service-role client, or an error tuple. */
async function ctx() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'غير مصرّح — سجّل الدخول' };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: 'مفتاح الخدمة غير مهيّأ' };
  return { supabase, user, admin };
}

/** Fetch the worker and assert the caller owns its center (or is a platform admin). */
async function ownedWorker(admin, supabase, user, workerId) {
  const { data: w } = await admin
    .from('workers')
    .select('id, center_id, full_name, phone, email, status, branch_id, role')
    .eq('id', workerId)
    .maybeSingle();
  if (!w) return { error: 'العامل غير موجود' };
  if (w.center_id !== user.id && !(await isPlatformAdmin(supabase, user))) {
    return { error: 'هذا العامل لا يتبع مركزك' };
  }
  return { worker: w };
}

/**
 * Generate (rotate) a single-use magic-login token and return the invite link.
 * The token is stored on the worker row with a 7-day expiry; redeeming it
 * consumes it. Rotating invalidates any previous link.
 */
export async function generateWorkerAccessToken(workerId) {
  if (!workerId) return { ok: false, error: 'معرّف العامل مفقود' };
  const c = await ctx();
  if (c.error) return { ok: false, error: c.error };
  const { worker, error } = await ownedWorker(c.admin, c.supabase, c.user, workerId);
  if (error) return { ok: false, error };
  if (worker.status !== 'active') return { ok: false, error: 'العامل موقوف — فعّله أولاً' };

  const token = generateAccessToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();
  const { error: upErr } = await c.admin
    .from('workers')
    .update({ access_token: token, access_token_expires_at: expiresAt })
    .eq('id', workerId);
  if (upErr) return { ok: false, error: upErr.message };

  await logWorkerActivity(c.admin, {
    workerId, merchantId: worker.center_id, actionType: 'token_generated',
    description: `أُصدر مفتاح دخول جديد لـ ${worker.full_name || 'عامل'}`,
  });

  const loginUrl = `${SITE_URL}/worker/login?token=${encodeURIComponent(token)}`;
  revalidatePath('/dashboard/workers-fleet');
  return { ok: true, token, loginUrl, phone: worker.phone || null, fullName: worker.full_name || '' };
}

/** Instant block / unblock — flips the canonical status (is_active mirrors it). */
export async function setWorkerActive(workerId, active) {
  if (!workerId) return { ok: false, error: 'معرّف العامل مفقود' };
  const c = await ctx();
  if (c.error) return { ok: false, error: c.error };
  const { worker, error } = await ownedWorker(c.admin, c.supabase, c.user, workerId);
  if (error) return { ok: false, error };

  const status = active ? 'active' : 'inactive';
  // Blocking also revokes any outstanding invite link.
  const patch = active ? { status } : { status, access_token: null, access_token_expires_at: null };
  const { error: upErr } = await c.admin.from('workers').update(patch).eq('id', workerId);
  if (upErr) return { ok: false, error: upErr.message };

  await logWorkerActivity(c.admin, {
    workerId, merchantId: worker.center_id, actionType: active ? 'unblocked' : 'blocked',
    description: `${active ? 'تفعيل' : 'إيقاف'} حساب ${worker.full_name || 'عامل'}`,
  });
  revalidatePath('/dashboard/workers-fleet');
  return { ok: true, status };
}

/** Permanently remove a worker (auth user + row). */
export async function deleteWorker(workerId) {
  if (!workerId) return { ok: false, error: 'معرّف العامل مفقود' };
  const c = await ctx();
  if (c.error) return { ok: false, error: c.error };
  const { worker, error } = await ownedWorker(c.admin, c.supabase, c.user, workerId);
  if (error) return { ok: false, error };

  // Delete the auth user first (best-effort) so the pseudo-email frees up, then
  // the row. worker_activities.worker_id ON DELETE CASCADE clears the trail.
  const { data: row } = await c.admin.from('workers').select('user_id').eq('id', workerId).maybeSingle();
  if (row?.user_id) await c.admin.auth.admin.deleteUser(row.user_id).catch(() => {});
  const { error: delErr } = await c.admin.from('workers').delete().eq('id', workerId);
  if (delErr) return { ok: false, error: delErr.message };

  await logWorkerActivity(c.admin, {
    workerId: null, merchantId: worker.center_id, actionType: 'worker_deleted',
    description: `حذف حساب ${worker.full_name || 'عامل'}`,
  });
  revalidatePath('/dashboard/workers-fleet');
  return { ok: true, id: workerId };
}

/** The audited activity timeline for the caller's center, newest first. */
export async function getWorkerActivities(limit = 100) {
  const c = await ctx();
  if (c.error) return { ok: false, error: c.error, activities: [] };
  const { data, error } = await c.admin
    .from('worker_activities')
    .select('id, worker_id, action_type, description, timestamp, duration_min')
    .eq('merchant_id', c.user.id)
    .order('timestamp', { ascending: false })
    .limit(Math.min(Number(limit) || 100, 300));
  if (error) return { ok: false, error: error.message, activities: [] };
  return { ok: true, activities: data || [] };
}
