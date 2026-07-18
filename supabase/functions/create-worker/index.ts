import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

// Canonicalize a Saudi phone to international digits (no +): 0512.. → 966512..
function canonPhone(p: string): string {
  let s = String(p || '').replace(/\D/g, '')
  if (s.startsWith('00966')) s = s.slice(2)
  else if (s.startsWith('966')) { /* keep */ }
  else if (s.startsWith('0')) s = '966' + s.slice(1)
  else if (s.length === 9 && s.startsWith('5')) s = '966' + s
  return s
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const WORKER_DOMAIN = 'workers.voldmotor.com'

/**
 * Provision a staff auth user + public.workers row for a center.
 *
 * This endpoint writes `app_metadata.center_id` / `app_metadata.role` — the exact
 * claims the RLS policies trust — so anything it accepts unvalidated is effectively
 * a way to mint an authorization claim. It previously had NO authorization at all:
 * it authenticated the caller and then provisioned whatever was asked. Three holes
 * are closed here:
 *
 *  1. ADMIN MINTING (critical). The legacy email/password branch took the email
 *     verbatim and created it with email_confirm:true, while the app grants
 *     PLATFORM ADMIN to any address ending in @ADMIN_EMAIL_DOMAIN. Any signed-in
 *     user could therefore mint themselves a working super-admin account.
 *  2. NO AUTHORIZATION. Any of the project's auth users could provision staff —
 *     unbounded auth-user creation, workers-table pollution, and squatting real
 *     people's addresses (email_confirm:true locks the victim out of signing up).
 *  3. UNVERIFIED branch_id, written straight into app_metadata and workers.branch_id
 *     with only an FK to branches(id) — which accepts ANY center's branch.
 *
 * Authorization mirrors app/dashboard/layout.jsx exactly: an ACTIVE workers row
 * means staff (manager with can_transfer_staff only); no row means the owner.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ADMIN_DOMAIN = (Deno.env.get('ADMIN_EMAIL_DOMAIN') || 'voldmotor.com').toLowerCase()

    // ── 1. Authenticate ──
    // Pass the token explicitly rather than relying on the global Authorization
    // header being honoured by auth-js (that behaviour is version-dependent and
    // the dependency is on a floating major).
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return json({ error: 'unauthorized' }, 401)
    const caller = createClient(url, anon)
    const { data: { user }, error: uerr } = await caller.auth.getUser(token)
    if (uerr || !user) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(url, service)

    // ── 2. Authorize + resolve the center from a TRUSTED source ──
    // Never from the request body, and never from user_metadata.
    const { data: staffRow } = await admin
      .from('workers')
      .select('center_id, role, can_transfer_staff')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    const callerRole = staffRow ? String(staffRow.role || 'technician').toLowerCase() : 'owner'
    if (callerRole !== 'owner' && !(callerRole === 'manager' && staffRow?.can_transfer_staff)) {
      return json({ error: 'إضافة الموظفين متاحة لمالك المركز فقط' }, 403)
    }
    const center_id: string = staffRow?.center_id || user.id

    // ── 3. Governance: a frozen / audited center may not mint new staff JWTs ──
    // Only blocks when the row exists AND the flag is set — some live centers have
    // no public.users row, and requiring one would break legitimate owners.
    const { data: gov } = await admin
      .from('users').select('is_frozen, under_audit').eq('id', center_id).maybeSingle()
    if (gov?.is_frozen) return json({ error: 'الحساب مجمّد — لا يمكن إضافة موظفين' }, 403)
    if (gov?.under_audit) return json({ error: 'الحساب تحت التدقيق — إضافة الموظفين موقوفة مؤقتاً' }, 403)

    const body = await req.json().catch(() => ({}))
    const full_name = String(body.full_name || '').trim()
    const national_id = String(body.national_id || '').trim()
    const phone = String(body.phone || '').trim()
    const roleIn = String(body.role || 'technician').toLowerCase()
    const role = roleIn === 'manager' ? 'manager' : 'technician'   // staff roles only
    const branch_id = body.branch_id ? String(body.branch_id) : null
    const pin = body.pin ? String(body.pin).trim() : ''

    // A manager must not grow the manager tier — RLS grants managers the whole
    // center's orders, versus a technician's own assignments only.
    if (callerRole === 'manager' && role === 'manager') {
      return json({ error: 'إضافة مشرف متاحة لمالك المركز فقط' }, 403)
    }

    // ── 4. Login email + password ──
    let email: string
    let password: string
    if (pin) {
      if (!full_name || !phone) return json({ error: 'الاسم ورقم الجوال مطلوبان' }, 400)
      if (!/^\d{4,8}$/.test(pin)) return json({ error: 'الرمز السري غير صالح' }, 400)
      const canon = canonPhone(phone)
      if (!canon) return json({ error: 'رقم الجوال غير صحيح' }, 400)
      email = `${canon}@${WORKER_DOMAIN}`
      password = 'vm' + pin   // deterministic ≥6 chars to satisfy GoTrue min length
    } else {
      email = String(body.email || '').trim().toLowerCase()
      password = String(body.password || '').trim()
      if (!full_name || !email || !password) return json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, 400)
      if (password.length < 6) return json({ error: 'كلمة المرور 6 خانات على الأقل' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'البريد غير صحيح' }, 400)

      // CRITICAL: the app grants platform admin by email domain, and this endpoint
      // creates accounts pre-confirmed. Never let a caller pick an address on the
      // admin domain (or a subdomain of it), nor squat the worker pseudo-domain.
      const domain = email.split('@')[1] || ''
      if (domain === ADMIN_DOMAIN || domain.endsWith('.' + ADMIN_DOMAIN)) {
        return json({ error: 'لا يمكن إنشاء حساب على نطاق الإدارة' }, 403)
      }
      if (domain === WORKER_DOMAIN) {
        return json({ error: 'هذا النطاق مخصّص لحسابات الفنيين (استخدم الرمز السري)' }, 400)
      }
    }

    // ── 5. branch_id must belong to THIS center ──
    // The FK only proves the branch exists somewhere; it accepts another tenant's.
    if (branch_id) {
      if (!UUID_RE.test(branch_id)) return json({ error: 'معرّف الفرع غير صالح' }, 400)
      const { data: br } = await admin
        .from('branches').select('id').eq('id', branch_id).eq('owner_id', center_id).maybeSingle()
      if (!br) return json({ error: 'الفرع غير موجود في هذا المركز' }, 403)
    }

    const { data: centerRow } = await admin.from('users').select('shop_name').eq('id', center_id).maybeSingle()
    const center_name = centerRow?.shop_name || (staffRow ? '' : (user.user_metadata?.shop_name || user.email?.split('@')[0] || ''))

    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      // user_metadata: للعرض في الواجهة فقط (قابل للتعديل من المستخدم — لا يُوثق به أمنياً)
      user_metadata: { role, center_id, center_name, full_name, phone, branch_id },
      // app_metadata: مصدر الثقة لسياسات RLS (لا يمكن للمستخدم تعديله، فقط service role)
      app_metadata: { role, center_id, branch_id },
    })
    if (cerr || !created?.user) return json({ error: /already|exists|registered/i.test(cerr?.message || '') ? 'هذا الموظف مسجّل مسبقاً' : (cerr?.message || 'failed') }, 400)

    const { data: centerEmailRow } = await admin.from('users').select('email').eq('id', center_id).maybeSingle()
    const { data: inserted, error: ierr } = await admin.from('workers').insert({
      center_id, center_email: centerEmailRow?.email || (staffRow ? null : user.email), full_name, national_id, phone,
      email, status: 'active', role, user_id: created.user.id, branch_id,
    }).select().single()
    if (ierr) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {})
      return json({ error: ierr.message }, 400)
    }
    return json({ ok: true, worker: inserted, login_email: email })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
