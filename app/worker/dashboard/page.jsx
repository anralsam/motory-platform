/**
 * /worker/dashboard — the standalone, isolated technician cockpit.
 *
 * Zero merchant chrome: it is NOT wrapped in the owner DashboardLayout, so no
 * owner nav, no branch switcher, no financial surfaces. The only session it ever
 * sees is the worker's own (established at /worker/login), so there is no
 * master-session leakage into this sub-tree.
 *
 * Gate: a real session AND an ACTIVE workers row. If the merchant blocked or
 * deleted the worker, the row lookup fails and we render Forbidden403 — the
 * session is powerless anyway because RLS keys off app_metadata + status.
 */
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getWorkerData } from '@/lib/dashboard-pro/queries';
import Forbidden403 from '@/components/Forbidden403';
import WorkerCockpit from '@/components/worker/WorkerCockpit';

export const dynamic = 'force-dynamic';

export default async function WorkerDashboardPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/worker/login');

  const admin = getSupabaseAdmin();
  const { data: worker } = admin
    ? await admin.from('workers')
        .select('id, full_name, role, branch_id, center_id, status')
        .eq('user_id', user.id).maybeSingle()
    : { data: null };

  // Blocked or deleted since the session was minted → hard wall.
  if (!worker || worker.status !== 'active') {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-950 p-6">
        <Forbidden403
          title="تم إيقاف الوصول"
          hint="أوقف مركزك هذا الحساب أو حذفه. تواصل مع إدارة المركز لإعادة التفعيل."
        />
      </div>
    );
  }

  // Branch name (nice header context) + the worker's branch-scoped orders.
  const [{ data: branch }, data] = await Promise.all([
    worker.branch_id
      ? admin.from('branches').select('name').eq('id', worker.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getWorkerData(user.id),
  ]);

  return (
    <WorkerCockpit
      workerName={worker.full_name || 'فنّي'}
      branchName={branch?.name || null}
      initialOrders={data.orders || []}
      services={data.services || []}
    />
  );
}
