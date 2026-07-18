import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/platformAdmin';
import { roleOf } from '@/lib/roles';
import { getMerchantGovernance } from '@/lib/dashboard-pro/queries';
import { AuthProvider } from '@/components/AuthProvider';
import DashboardLayout from '@/components/DashboardLayout';
import Lockdown from '@/components/Lockdown';


export default async function DashboardRouteLayout({ children }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth gate (middleware also guards this, belt-and-suspenders).
  if (!user) redirect('/auth/signin');

  // RBAC gate: technicians have NO business in the owner dashboard (financials,
  // invoices, customers). Their workspace is the task board. This runs on every
  // /dashboard/* page because they all share this layout.
  // SECURITY: the role MUST come from a trusted source. user_metadata is
  // client-writable (supabase.auth.updateUser({data})), so a technician could
  // set role='owner' to keep the owner shell AND dodge the freeze/audit wall
  // below. The authoritative source is the workers table (service-role read):
  // an ACTIVE workers row ⇒ staff with that row's role; no row ⇒ the owner.
  const admin = getSupabaseAdmin();
  const { data: staffRow } = admin
    ? await admin.from('workers').select('center_id, role').eq('user_id', user.id).eq('status', 'active').maybeSingle()
    : { data: null };
  const role = staffRow ? roleOf(staffRow.role) : 'owner';
  if (role === 'technician') redirect('/worker-tasks');

  // The tenant id every page filters by. Resolved ONCE here from the trusted
  // workers row and handed down through AuthProvider, so no client component has
  // to re-derive it from user_metadata (which the user can rewrite at will, and
  // which previously let the app issue genuinely cross-tenant queries with only
  // RLS standing between that and a leak).
  const centerId = staffRow?.center_id || user.id;

  // ── Platform governance gate ── (Super-Admins bypass.)
  // We RENDER a lockdown wall rather than redirect: the user is still authenticated,
  // and middleware bounces authed users off /auth/* — a redirect would loop.
  const platformAdmin = await isPlatformAdmin(supabase, user);
  if (!platformAdmin) {
    // Staff are governed by their center's flags, owners by their own — using the
    // same trusted centerId resolved above.
    const gov = await getMerchantGovernance(centerId);
    const blocked = gov.is_frozen ? 'frozen' : (gov.under_audit ? 'audit' : null);
    if (blocked) {
      return (
        <AuthProvider initialUser={{ id: user.id, email: user.email, user_metadata: user.user_metadata || {} }}>
          <Lockdown variant={blocked} />
        </AuthProvider>
      );
    }
  }

  const initialUser = {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
  };

  return (
    <AuthProvider initialUser={initialUser} initialCenterId={centerId} initialRole={role}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
