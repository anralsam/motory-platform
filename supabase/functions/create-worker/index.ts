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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''

    // Authenticate the caller (must be the signed-in owner).
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uerr } = await caller.auth.getUser()
    if (uerr || !user) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const full_name = String(body.full_name || '').trim()
    const national_id = String(body.national_id || '').trim()
    const phone = String(body.phone || '').trim()
    const roleIn = String(body.role || 'technician').toLowerCase()
    const role = roleIn === 'manager' ? 'manager' : 'technician'   // staff roles only
    const branch_id = body.branch_id ? String(body.branch_id) : null
    const pin = body.pin ? String(body.pin).trim() : ''

    // ── Determine login email + auth password ──
    // Phone/PIN flow (pseudo-email hack): {canonPhone}@workers.voldmotor.com, password = 'vm' + PIN.
    // Legacy flow: explicit email + password (kept for backward compatibility).
    let email: string
    let password: string
    if (pin) {
      if (!full_name || !phone) return json({ error: 'الاسم ورقم الجوال مطلوبان' }, 400)
      if (!/^\d{4,8}$/.test(pin)) return json({ error: 'الرمز السري غير صالح' }, 400)
      const canon = canonPhone(phone)
      if (!canon) return json({ error: 'رقم الجوال غير صحيح' }, 400)
      email = `${canon}@workers.voldmotor.com`
      password = 'vm' + pin   // deterministic ≥6 chars to satisfy GoTrue min length
    } else {
      email = String(body.email || '').trim().toLowerCase()
      password = String(body.password || '').trim()
      if (!full_name || !email || !password) return json({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, 400)
      if (password.length < 6) return json({ error: 'كلمة المرور 6 خانات على الأقل' }, 400)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'البريد غير صحيح' }, 400)
    }

    const admin = createClient(url, service)
    const center_name = (user.user_metadata?.shop_name) || (user.email?.split('@')[0]) || ''

    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      // user_metadata: للعرض في الواجهة فقط (قابل للتعديل من المستخدم — لا يُوثق به أمنياً)
      user_metadata: { role, center_id: user.id, center_name, full_name, phone, branch_id },
      // app_metadata: مصدر الثقة لسياسات RLS (لا يمكن للمستخدم تعديله، فقط service role)
      app_metadata: { role, center_id: user.id, branch_id },
    })
    if (cerr || !created?.user) return json({ error: /already|exists|registered/i.test(cerr?.message || '') ? 'هذا الموظف مسجّل مسبقاً' : (cerr?.message || 'failed') }, 400)

    const { data: inserted, error: ierr } = await admin.from('workers').insert({
      center_id: user.id, center_email: user.email, full_name, national_id, phone,
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
