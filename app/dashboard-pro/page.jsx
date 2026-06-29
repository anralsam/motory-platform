/**
 * VOLD MOTOR — Dashboard Pro (Server Component / Orchestrator).
 * Single unified entry point: fetches ALL data server-side (service-role) and
 * hands a per-page `content` map to the client <DashboardLayout>, which swaps
 * pages with NO reload. Logic lives in lib/dashboard-pro/queries; components are
 * presentational. Role-aware (admin / merchant / worker).
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminData, getMerchantData, getWorkerData, getIntelligenceData, getOperationsData } from '@/lib/dashboard-pro/queries';
import DashboardLayout from '@/components/dashboard-pro/DashboardLayout';
import AdminDashboard from '@/components/dashboard-pro/AdminDashboard';
import MerchantDashboard from '@/components/dashboard-pro/MerchantDashboard';
import OperationsGrid from '@/components/dashboard-pro/OperationsGrid';
import FinancePanel from '@/components/dashboard-pro/FinancePanel';
import GovernancePanel from '@/components/dashboard-pro/GovernancePanel';
import AssignControl from '@/components/dashboard-pro/AssignControl';
import StatusPill from '@/components/dashboard-pro/StatusPill';
import WorkerModule from '@/components/dashboard-pro/WorkerModule';
import NoData from '@/components/dashboard-pro/NoData';

export const dynamic = 'force-dynamic';

const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

async function detectRole(supabase, user) {
  if (!user) return 'merchant';
  if (
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
  ) return 'admin';
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: w } = await admin.from('workers').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (w) return 'worker';
  }
  const { data: urow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  return urow?.role === 'admin' ? 'admin' : 'merchant';
}

const MONTHS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

function computeFinance(orders) {
  const completed = orders.filter((o) => o.status === 'completed');
  const revenue = completed.reduce((s, o) => s + (Number(o.price) || 0), 0);
  const ordersValue = orders.reduce((s, o) => s + (Number(o.price) || 0), 0);
  return { revenue, ordersValue, completed: completed.length, avgOrder: completed.length ? Math.round(revenue / completed.length) : 0 };
}

function revenueByMonth(orders) {
  const arr = Array(12).fill(0);
  orders.forEach((o) => {
    if (o.status === 'completed' && o.created_at) arr[new Date(o.created_at).getMonth()] += Number(o.price) || 0;
  });
  return MONTHS.map((label, i) => ({ label, value: arr[i] }));
}

// ── Admin content map ──
async function adminContent() {
  const [adminData, intelRaw, ops] = await Promise.all([getAdminData(), getIntelligenceData(), getOperationsData(20)]);
  const intel = intelRaw || { orders: [], workers: [], branches: [] };
  const fin = computeFinance(intel.orders);
  const metrics = {
    revenue: fin.revenue,
    active: intel.orders.filter((o) => o.status === 'in_progress' || o.status === 'ready').length,
    workshops: adminData?.joinStats?.approved || 0,
    pending: adminData?.joinStats?.pending || 0,
  };
  const approvals = adminData?.acceptanceRows || [];
  return {
    dashboard: <AdminDashboard metrics={metrics} revenue={revenueByMonth(intel.orders)} approvals={approvals} />,
    operations: <OperationsGrid orders={ops} />,
    finance: <FinancePanel {...fin} />,
    governance: <GovernancePanel rows={approvals} pending={metrics.pending} />,
  };
}

// ── Merchant content map ──
async function merchantContent(merchantId) {
  const d = await getMerchantData(merchantId);
  if (!d || d.empty) {
    return { dashboard: <NoData title="لا توجد طلبات" hint="لا توجد طلبات ورشة على حسابك بعد." />, operations: <NoData title="لا توجد طلبات" /> };
  }
  const nameByUser = Object.fromEntries(d.workers.map((w) => [w.user_id, w.full_name]));
  const completed = d.orders.filter((o) => o.status === 'completed').length;
  const mMetrics = {
    revenue: d.perf.revenue,
    active: d.perf.live,
    techLoad: d.perf.utilization,
    health: d.orders.length ? Math.round((completed / d.orders.length) * 100) : 0,
  };
  const liveOrders = d.orders.filter((o) => o.status !== 'completed').slice(0, 12);
  return {
    dashboard: <MerchantDashboard metrics={mMetrics} orders={liveOrders} inventory={d.inventory} workers={d.workers} />,
    operations: (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {d.orders.slice(0, 12).map((o) => (
          <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-slate-400" dir="ltr">#{String(o.id).slice(0, 8)}</span>
              <StatusPill status={o.status} />
            </div>
            <div className="text-sm font-semibold text-slate-900">{o.customer_name || 'عميل'}</div>
            <div className="mb-4 text-xs text-slate-400">{[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}{o.plate ? <span dir="ltr"> · {o.plate}</span> : null}</div>
            {o.assigned_to ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {nameByUser[o.assigned_to] || 'فنّي'}</span>
            ) : (
              <AssignControl orderId={o.id} workers={d.workers} />
            )}
          </div>
        ))}
      </div>
    ),
  };
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  let content;
  if (role === 'admin') {
    content = await adminContent();
  } else if (role === 'worker') {
    const { orders, inventory } = await getWorkerData(user?.id);
    content = { tasks: <WorkerModule orders={orders} inventory={inventory} /> };
  } else {
    content = await merchantContent(user?.id);
  }

  return <DashboardLayout role={role} userName={userName} content={content} />;
}
