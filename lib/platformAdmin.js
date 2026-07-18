import 'server-only';

/**
 * The SINGLE source of truth for "is this user a platform admin?".
 *
 * Platform admin is granted by ONE thing: public.users.role = 'admin'. That column
 * is protected by the guard_users_role trigger, which silently downgrades any
 * attempt to self-insert or self-update role='admin', so it cannot be spoofed
 * from the client.
 *
 * Deliberately NOT granted by email domain any more. The old rule —
 * `email.endsWith('@' + ADMIN_EMAIL_DOMAIN)` — turned "can create an account with
 * an address of my choosing" into "can become a platform admin", and the
 * create-worker endpoint did exactly that: it accepted a caller-supplied email and
 * created it pre-confirmed, so any signed-in user could mint themselves a
 * super-admin. That specific hole is now plugged at the endpoint too, but the rule
 * itself is the fragile part: ANY future path that provisions an account from a
 * user-supplied address would silently reopen it. Identity should come from a
 * protected column, not from the spelling of a string.
 *
 * Verified safe to tighten: the project's only admin (users.role='admin') is not
 * on the admin domain, and zero accounts on that domain exist.
 *
 * app_metadata.role is still honoured — it is service-role-only and signed into
 * the JWT, so it is a legitimate trusted claim.
 */
export async function isPlatformAdmin(supabase, user) {
  if (!user) return false;
  if (user.app_metadata?.role === 'admin') return true;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin';
}
