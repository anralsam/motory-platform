import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

// ── Super-Admin gate ─────────────────────────────────────────────────────────
// This is the platform-owner control room (merchant approvals), NOT the merchant
// dashboard. Access is restricted to platform admins. The real security boundary
// is the `admin-merchants` Edge Function (it re-verifies the JWT + admin role with
// the service key); this layout is the matching UX gate so non-admins never see
// the screen. Both use the same admin definition:
//   • email @ the admin domain (default voldmotor.com), OR
//   • user_metadata.role === 'admin' / app_metadata.role === 'admin', OR
//   • users table row with role === 'admin'.
const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

export default async function AdminLayout({ children }) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin?redirect=/admin');

  let isAdmin =
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin';

  if (!isAdmin) {
    const { data: urow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = urow?.role === 'admin';
  }

  // Not an admin → send them to their own merchant dashboard, not the control room.
  if (!isAdmin) redirect('/dashboard');

  return children;
}
