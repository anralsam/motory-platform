import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * login-guard — server-side brute-force protection for email sign-ins.
 *
 * It verifies the password ITSELF (so only genuine wrong-password attempts
 * count) and keeps a per-account failed-attempt counter in join_requests.
 * After MAX_ATTEMPTS consecutive failures the merchant account is locked
 * (status = 'locked') and can only be reactivated by support from the
 * super-admin panel. The counter lives in the database, so clearing the
 * browser cache / localStorage cannot bypass it.
 *
 * Public (pre-auth) endpoint → verify_jwt must be disabled on deploy.
 * It never returns a session; the second factor (email OTP) is what
 * actually establishes the session, on the client.
 */

const MAX_ATTEMPTS = 15;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...CORS },
    status,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const { email, password } = await req.json();
    const mail = (email ?? "").trim().toLowerCase();
    const pass = password ?? "";
    if (!mail || !pass) throw new Error("email and password required");

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const sb = createClient(url, serviceKey);

    // Merchant record (may be null for the super-admin / worker pseudo-emails —
    // those still get password+OTP, just no DB-tracked merchant lock).
    const { data: row } = await sb
      .from("join_requests")
      .select("id,status,failed_attempts")
      .eq("email", mail)
      .maybeSingle();

    // Already locked → refuse before even checking the password.
    if (row && row.status === "locked") {
      return json({ ok: true, locked: true, passwordValid: false, attemptsLeft: 0 });
    }

    // Verify the password against Supabase Auth without persisting a session.
    const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body: JSON.stringify({ email: mail, password: pass }),
    });
    const passwordValid = tokenRes.ok;

    if (passwordValid) {
      // Reset the counter on a confirmed-correct password.
      if (row && (row.failed_attempts ?? 0) !== 0) {
        await sb.from("join_requests")
          .update({ failed_attempts: 0, locked_at: null })
          .eq("id", row.id);
      }
      return json({ ok: true, locked: false, passwordValid: true, attemptsLeft: MAX_ATTEMPTS });
    }

    // Wrong password. If this account isn't a tracked merchant, just report it.
    if (!row) {
      return json({ ok: true, locked: false, passwordValid: false, attemptsLeft: MAX_ATTEMPTS });
    }

    const next = (row.failed_attempts ?? 0) + 1;
    if (next >= MAX_ATTEMPTS) {
      await sb.from("join_requests").update({
        status: "locked",
        failed_attempts: next,
        locked_at: new Date().toISOString(),
        notes: "تم قفل الحساب تلقائيًا بعد تجاوز 15 محاولة دخول خاطئة متتالية — بانتظار تحقق الدعم الفني وإعادة التفعيل",
      }).eq("id", row.id);
      return json({ ok: true, locked: true, passwordValid: false, attemptsLeft: 0 });
    }

    await sb.from("join_requests").update({ failed_attempts: next }).eq("id", row.id);
    return json({ ok: true, locked: false, passwordValid: false, attemptsLeft: MAX_ATTEMPTS - next });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message ?? "error" }, 400);
  }
});
