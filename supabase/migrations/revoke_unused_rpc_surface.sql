-- Shrink the exposed SECURITY DEFINER surface to only what the app actually calls.
-- Usage verified across app/ lib/ components/ store/ supabase/functions/ first.

-- 1. Trigger functions must never be callable as RPCs. Triggers do not consult
--    EXECUTE grants, so this removes the /rest/v1/rpc/... endpoint without
--    affecting the trigger. guard_users_role is the trigger that blocks
--    self-promotion to admin — exposing it as an endpoint is pure downside.
revoke execute on function public.guard_users_role()            from anon, authenticated;
revoke execute on function public.handle_new_user()             from anon, authenticated;
revoke execute on function public.set_default_branch()          from anon, authenticated;
revoke execute on function public.set_default_branch_workers()  from anon, authenticated;

-- 2. The DB-level half of the PII enumeration oracle. auth-check / merchant-login
--    were retired at the edge, but these RPCs still let any anonymous caller ask
--    "is this email registered?" straight through PostgREST. Zero callers in the
--    app — they belonged to the same legacy login flow.
revoke execute on function public.account_status(text) from anon, authenticated;
revoke execute on function public.email_exists(text)   from anon, authenticated;

-- 3. Admin-only reporting RPCs — each already starts with an is_admin() gate;
--    this is defence in depth so a non-admin cannot even reach the gate.
revoke execute on function public.admin_dues_since(timestamptz) from anon;
revoke execute on function public.admin_monthly_dues()          from anon;
revoke execute on function public.admin_visits_raw(timestamptz) from anon;

-- LEFT CALLABLE (verified in use):
--   get_public_receipt(uuid) — anon, powers /receipt/[id]
--   my_branches()           — authenticated, branch switcher + URL sync
--   is_admin()              — used by RLS policies and payment-webhook
