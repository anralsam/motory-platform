import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/**
 * Payment webhook for VOLD MOTOR platform commission (Moyasar / Tap-compatible).
 *
 * Settles a `platform_billing` row using the SERVICE ROLE (bypasses RLS — calls come
 * from an external gateway, not a logged-in user).
 *
 * Authorization (one of):
 *   1) Gateway → header `x-webhook-secret: <PAYMENT_WEBHOOK_SECRET>`  (server-to-server)
 *   2) Owner self-confirm (mock checkout) → `Authorization: Bearer <user JWT>` where the
 *      caller owns the targeted billing row.
 *
 * Body: { transaction_id?, billing_id?, status }   status: 'paid' | 'failed'
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || ''
    const admin = createClient(url, service)

    const body = await req.json().catch(() => ({}))
    const transaction_id = body.transaction_id ? String(body.transaction_id) : null
    const billing_id = body.billing_id ? String(body.billing_id) : null
    const rawStatus = String(body.status || '').toLowerCase()
    if (!transaction_id && !billing_id) return json({ error: 'transaction_id or billing_id required' }, 400)

    // Map gateway / manual status → our enum
    const newStatus =
      ['paid', 'captured', 'succeeded', 'authorized'].includes(rawStatus) ? 'PAID'
      : ['verifying', 'under_review', 'pending_review', 'transferred'].includes(rawStatus) ? 'VERIFYING'
      : ['failed', 'declined', 'voided', 'expired'].includes(rawStatus) ? 'FAILED'
      : null
    if (!newStatus) return json({ error: 'unknown status' }, 400)

    // Locate the target billing row (by transaction_id first, else billing_id)
    let q = admin.from('platform_billing').select('id, merchant_id, status')
    q = transaction_id ? q.eq('transaction_id', transaction_id) : q.eq('id', billing_id)
    const { data: row, error: findErr } = await q.maybeSingle()
    if (findErr) return json({ error: findErr.message }, 400)
    if (!row) return json({ error: 'billing record not found' }, 404)

    // ── Authorization ──
    const secretHeader = req.headers.get('x-webhook-secret') || ''
    const bySecret = webhookSecret.length > 0 && secretHeader === webhookSecret
    let authorized = bySecret
    if (!authorized) {
      // Owner self-confirm path: validate the bearer JWT owns this row.
      const authHeader = req.headers.get('Authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
        const { data: { user } } = await caller.auth.getUser()
        if (user && user.id === row.merchant_id) authorized = true
      }
    }
    if (!authorized) return json({ error: 'unauthorized' }, 401)

    // Idempotent: already settled → return ok without re-writing
    if (row.status === 'PAID') return json({ ok: true, status: 'PAID', already: true })

    const upd: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
    if (transaction_id) upd.transaction_id = transaction_id   // keep null for manual VERIFYING
    const { error: upErr } = await admin.from('platform_billing').update(upd).eq('id', row.id)
    if (upErr) return json({ error: upErr.message }, 400)

    return json({ ok: true, status: newStatus, billing_id: row.id })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
