import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { roleOf } from '@/lib/roles';
import { getMerchantGovernance } from '@/lib/dashboard-pro/queries';
import { AuthProvider } from '@/components/AuthProvider';
import DashboardLayout from '@/components/DashboardLayout';
import Lockdown from '@/components/Lockdown';

const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

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
  const role = roleOf((user.user_metadata || {}).role);
  if (role === 'technician') redirect('/worker-tasks');

  // ── Platform governance gate ── (Super-Admins bypass.)
  // We RENDER a lockdown wall rather than redirect: the user is still authenticated,
  // and middleware bounces authed users off /auth/* — a redirect would loop.
  const isPlatformAdmin = (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN);
  if (!isPlatformAdmin) {
    // Resolve the center from a TRUSTED source. user_metadata.center_id is
    // client-writable, so a manager could repoint it at an unfrozen center to
    // dodge the wall — use the authoritative workers table for non-owners.
    let centerId = user.id;
    if (role !== 'owner') {
      const admin = getSupabaseAdmin();
      const { data: w } = admin ? await admin.from('workers').select('center_id').eq('user_id', user.id).maybeSingle() : { data: null };
      centerId = w?.center_id || user.id;
    }
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
    <AuthProvider initialUser={initialUser}>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
