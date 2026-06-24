import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { roleOf } from '@/lib/roles';
import { AuthProvider } from '@/components/AuthProvider';
import DashboardLayout from '@/components/DashboardLayout';

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
