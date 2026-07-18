const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

/**
 * RETIRED ENDPOINT — auth-check
 *
 * This was an UNAUTHENTICATED service-role endpoint that took an email or phone
 * and answered with the merchant's real email address and shop name, using
 * state-distinct replies for pending / rejected / nonexistent. That is a PII
 * enumeration oracle: anyone could confirm whether a number belongs to a
 * registered center and read back the owner's address.
 * merchant-login went further and would trigger an OTP email / Twilio SMS to any
 * enumerated account with no rate limit — an unmetered, billable side effect
 * reachable by anonymous callers.
 *
 * Superseded by the login-guard + otp-send/otp-verify flow, which is what
 * app/auth/signin/page.jsx actually calls. An exhaustive caller hunt across the
 * Next.js app (including the compiled .next bundle), the legacy vanilla site and
 * its deploy artifact found ZERO live callers.
 *
 * Kept as a 410 stub rather than deleted so the retirement is reversible and any
 * forgotten caller surfaces as a clean, greppable failure instead of a 404.
 * The identifier is deliberately NEVER logged — logging it would just relocate
 * the leak into the log sink.
 */
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors, status: 204 });
  console.warn('[RETIRED] auth-check invoked');
  return new Response(
    JSON.stringify({ error: 'هذه الخدمة لم تعد متاحة. استخدم صفحة تسجيل الدخول.' }),
    { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
