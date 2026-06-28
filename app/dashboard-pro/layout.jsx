/**
 * /dashboard-pro layout — server-side auth gate (defense in depth; the global
 * middleware also protects this route). Role-specific rendering happens in
 * page.jsx. Kept thin so the page owns data + composition.
 */
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function DashboardProLayout({ children }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin?redirect=/dashboard-pro');
  return children;
}
