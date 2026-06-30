/**
 * VOLD MOTOR — Dashboard Pro (Server Component / Orchestrator).
 * Single unified entry point: fetches ALL data server-side (service-role) and
 * hands a per-page `content` map to the client <DashboardLayout>, which swaps
 * pages with NO reload. Logic lives in lib/dashboard-pro/queries; components are
 * presentational. Role-aware (admin / merchant / worker).
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminData, getMerchantData, getWorkerData, getIntelligenceData, getOperationsData, getMerchantServices } from '@/lib/dashboard-pro/queries';
import DashboardLayout from '@/components/dashboard-pro/DashboardLayout';
import AdminConsole from '@/components/dashboard-pro/AdminConsole';
import AdminDashboard from '@/components/dashboard-pro/AdminDashboard';
import MerchantDashboard from '@/components/dashboard-pro/MerchantDashboard';
import OperationsGrid from '@/components/dashboard-pro/OperationsGrid';
import FinancePanel from '@/components/dashboard-pro/FinancePanel';
import GovernancePanel from '@/components/dashboard-pro/GovernancePanel';
import AssignControl from '@/components/dashboard-pro/AssignControl';
import StatusPill from '@/components/dashboard-pro/StatusPill';
import WorkerDashboard from '@/components/dashboard-pro/WorkerDashboard';
import ServicesManager from '@/components/dashboard-pro/ServicesManager';
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

// ── Merchant content map ──
async function merchantContent(merchantId) {
  const [d, services] = await Promise.all([getMerchantData(merchantId), getMerchantServices(merchantId)]);
  const servicesView = <ServicesManager initial={services} />;
  if (!d || d.empty) {
    return { dashboard: <NoData title="لا توجد طلبات" hint="لا توجد طلبات ورشة على حسابك بعد." />, operations: <NoData title="لا توجد طلبات" />, services: servicesView };
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
  // Peak times by weekday + last-hour snapshot
  const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const wd = Array(7).fill(0);
  d.orders.forEach((o) => { if (o.created_at) wd[new Date(o.created_at).getDay()]++; });
  const peak = DAYS_AR.map((label, i) => ({ label, value: wd[i] }));
  const daysWithData = wd.filter((n) => n > 0).length || 1;
  const lastHour = { inHall: d.perf.live, dailyAvg: Math.round(d.orders.length / daysWithData) };
  // Monthly performance trend (revenue + operations)
  const moRev = Array(12).fill(0); const moOps = Array(12).fill(0);
  d.orders.forEach((o) => { if (o.created_at) { const i = new Date(o.created_at).getMonth(); moOps[i]++; if (o.status === 'completed') moRev[i] += Number(o.price) || 0; } });
  const trend = MONTHS.map((label, i) => ({ label, revenue: moRev[i], orders: moOps[i] }));
  // Month-over-month growth (current vs previous month)
  const nowM = new Date().getMonth();
  const prevM = (nowM + 11) % 12;
  const pctGrow = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);
  const revGrowth = pctGrow(moRev[nowM], moRev[prevM]);
  const ordGrowth = pctGrow(moOps[nowM], moOps[prevM]);
  // Status distribution (donut)
  const STATUS_META = [
    { key: 'pending', name: 'انتظار', color: '#f59e0b' },
    { key: 'in_progress', name: 'جاري', color: '#2563eb' },
    { key: 'ready', name: 'جاهز', color: '#7c3aed' },
    { key: 'completed', name: 'مكتمل', color: '#10b981' },
  ];
  const statusDist = STATUS_META
    .map((s) => ({ name: s.name, value: d.orders.filter((o) => o.status === s.key).length, color: s.color }))
    .filter((s) => s.value > 0);
  // Top services (by order count + revenue)
  const svcMap = {};
  d.orders.forEach((o) => {
    const k = o.service_type || 'أخرى';
    if (!svcMap[k]) svcMap[k] = { name: k, count: 0, revenue: 0 };
    svcMap[k].count++;
    if (o.status === 'completed') svcMap[k].revenue += Number(o.price) || 0;
  });
  const topServices = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5);
  return {
    dashboard: <MerchantDashboard metrics={mMetrics} orders={liveOrders} inventory={d.inventory} workers={d.workers} peak={peak} lastHour={lastHour} trend={trend} statusDist={statusDist} topServices={topServices} totalOrders={d.orders.length} revGrowth={revGrowth} ordGrowth={ordGrowth} />,
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
    services: servicesView,
  };
}

// ── Super-Admin console data (dark GitHub-Primer command center) ──
async function adminConsoleData() {
  const [adminData, intelRaw] = await Promise.all([getAdminData(), getIntelligenceData()]);
  const intel = intelRaw || { orders: [] };
  const completedRev = intel.orders.filter((o) => o.status === 'completed').reduce((s, o) => s + (Number(o.price) || 0), 0);
  const total = intel.orders.length;
  const completed = intel.orders.filter((o) => o.status === 'completed').length;
  const rows = adminData?.acceptanceRows || [];
  const centers = rows.filter((r) => r.status === 'approved').map((r) => ({ id: r.id, name: r.shop_name || '—', city: r.location || '—', pkg: 'Pro', engineers: '—' }));
  const metrics = {
    commissions: Math.round(completedRev * 0.1),
    gmv: completedRev,
    slaPct: total ? Math.round((completed / total) * 100) : 0,
    underInspection: adminData?.joinStats?.pending || 0,
    carsInOps: intel.orders.filter((o) => o.status === 'in_progress').length,
  };
  return { metrics, centers, requests: rows };
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  // Super Admin → dedicated dark console (its own shell)
  if (role === 'admin') {
    return <AdminConsole data={await adminConsoleData()} userName={userName} />;
  }

  // Technician → dedicated mobile-first full-screen console (its own shell)
  if (role === 'worker') {
    const { orders, inventory } = await getWorkerData(user?.id);
    return <WorkerDashboard userName={userName} orders={orders} inventory={inventory} />;
  }

  const content = await merchantContent(user?.id);
  return <DashboardLayout role={role} userName={userName} content={content} />;
}
