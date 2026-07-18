import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/platformAdmin';
import { getMerchantGovernance } from '@/lib/dashboard-pro/queries';
import Lockdown from '@/components/Lockdown';


/**
 * Governance gate for the technician workspace. /worker-tasks previously had no
 * server layout, so a technician of a frozen/under-audit center could keep working
 * (loading + mutating orders). This gate resolves the tech's center from the
 * authoritative workers table (NOT client-writable metadata) and walls them off.
 * Super-Admins bypass.
 */
export default async function WorkerTasksLayout({ children }) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const platformAdmin = await isPlatformAdmin(supabase, user);
  if (!platformAdmin) {
    const admin = getSupabaseAdmin();
    let centerId = user.id;
    if (admin) {
      const { data: w } = await admin.from('workers').select('center_id').eq('user_id', user.id).maybeSingle();
      centerId = w?.center_id || user.id;
    }
    const gov = await getMerchantGovernance(centerId);
    const blocked = gov.is_frozen ? 'frozen' : (gov.under_audit ? 'audit' : null);
    if (blocked) return <Lockdown variant={blocked} />;
  }

  return children;
}
