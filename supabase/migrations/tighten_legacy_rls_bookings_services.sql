-- Applied to prod (project pycyttykvmbhykltnxzj) on 2026-07-02 via apply_migration.
-- Closes cross-tenant exposure on two LEGACY tables the current Next.js app does
-- NOT use (the app uses `orders` + `service_menu`). Change only TIGHTENS access.
--
-- Findings came from a full RLS audit: all 21 public tables have RLS enabled and
-- the live business tables (orders/customers/inventory/workers/visits/expenses/
-- platform_billing/service_menu/branches/transactions/vehicles/credits/promo_codes/
-- whatsapp_automations/users) are correctly merchant/role-scoped. is_admin() reads
-- public.users.role (NOT user_metadata) and is protected by the guard_users_role
-- trigger, so `OR is_admin()` policies are not spoofable. Only these two remained:

-- 1) bookings: public booking queue holding customer PII (name + phone) with NO
--    merchant column. SELECT/UPDATE were open to ANY signed-in user
--    (auth.uid() IS NOT NULL) => any merchant could read every center's leads.
--    Restrict reads/updates to platform admin. Public insert (booking form) and
--    admin delete are left unchanged.
DROP POLICY IF EXISTS bookings_select_authenticated ON public.bookings;
DROP POLICY IF EXISTS bookings_update_authenticated ON public.bookings;
CREATE POLICY bookings_select_admin ON public.bookings
  FOR SELECT USING (public.is_admin());
CREATE POLICY bookings_update_admin ON public.bookings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2) services (legacy; the app catalog uses service_menu): drop the anon/public
--    read of every merchant's active services. Owner + admin access remains via
--    services_owner_all and services_merchant_all.
DROP POLICY IF EXISTS services_public_read ON public.services;
