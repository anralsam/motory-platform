/**
 * VOLD MOTOR — Dashboard Pro (Server Component / Orchestrator).
 * Single unified entry point: fetches ALL data server-side (service-role) and
 * hands a per-page `content` map to the client <DashboardLayout>, which swaps
 * pages with NO reload. Logic lives in lib/dashboard-pro/queries; components are
 * presentational. Role-aware (admin / merchant / worker).
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminData, getMerchantData, getWorkerData, getIntelligenceData, getOperationsData, getMerchantServices, getMerchantGovernance } from '@/lib/dashboard-pro/queries';
import Lockdown from '@/components/Lockdown';
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
  // Hand the RAW orders to the Grand Unified DNA — the client engine derives every
  // dataset reactively from the Global Control Bar (range + metric). No precompute.
  return {
    dashboard: <MerchantDashboard orders={d.orders} workers={d.workers} inventory={d.inventory} services={services} />,
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

  // ── Per-merchant consolidation (macro summary + leaderboard) ──
  const byMerchant = {};
  (intel.orders || []).forEach((o) => {
    if (!o.merchant_id) return;
    const m = byMerchant[o.merchant_id] || (byMerchant[o.merchant_id] = { revenue: 0, orders: 0 });
    m.orders += 1;
    if (o.status === 'completed') m.revenue += Number(o.price) || 0;
  });
  const brByOwner = {};
  (intel.branches || []).forEach((b) => {
    const x = brByOwner[b.owner_id] || (brByOwner[b.owner_id] = { count: 0, name: null });
    x.count += 1;
    if (b.is_primary || !x.name) x.name = b.name;
  });
  const staffByCenter = {};
  (intel.workers || []).forEach((w) => { if (w.center_id) staffByCenter[w.center_id] = (staffByCenter[w.center_id] || 0) + 1; });

  const merchantIds = [...new Set([...Object.keys(byMerchant), ...Object.keys(brByOwner)])];
  const totalRev = merchantIds.reduce((s, id) => s + (byMerchant[id]?.revenue || 0), 0);

  // Governance + profile names for every ranked merchant (single batched read).
  const admin = getSupabaseAdmin();
  let govById = {};
  if (admin && merchantIds.length) {
    const { data: us } = await admin.from('users').select('id, shop_name, is_frozen, under_audit, tier_plan').in('id', merchantIds);
    govById = Object.fromEntries((us || []).map((u) => [u.id, u]));
  }

  const leaderboard = merchantIds
    .map((id) => ({
      id,
      name: govById[id]?.shop_name || brByOwner[id]?.name || 'مركز',
      branches: brByOwner[id]?.count || 0,
      orders: byMerchant[id]?.orders || 0,
      staff: staffByCenter[id] || 0,
      revenue: byMerchant[id]?.revenue || 0,
      is_frozen: !!govById[id]?.is_frozen,
      under_audit: !!govById[id]?.under_audit,
      tier_plan: govById[id]?.tier_plan || 'standard',
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .map((m) => ({ ...m, share: totalRev ? Math.round((m.revenue / totalRev) * 100) : 0 }));

  const macro = { revenue: totalRev, activeCenters: merchantIds.length, totalOps: total };

  return { metrics, centers, requests: rows, orders: intel.orders || [], workers: intel.workers || [], macro, leaderboard };
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  // Super Admin → dedicated dark console (its own shell). Admins bypass governance.
  if (role === 'admin') {
    return <AdminConsole data={await adminConsoleData()} userName={userName} />;
  }

  // ── Platform governance gate (merchant + worker) ──
  let centerId = user?.id;
  if (role === 'worker') {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: w } = await admin.from('workers').select('center_id').eq('user_id', user?.id).maybeSingle();
      centerId = w?.center_id || user?.id;
    }
  }
  const gov = await getMerchantGovernance(centerId);
  // Render the wall (don't redirect) — the user is still authed and middleware
  // bounces authed users off /auth/*, which would create a redirect loop.
  const blocked = gov.is_frozen ? 'frozen' : (gov.under_audit ? 'audit' : null);
  if (blocked) return <Lockdown variant={blocked} />;

  // Technician → dedicated mobile-first full-screen console (its own shell)
  if (role === 'worker') {
    const { orders, inventory, automations } = await getWorkerData(user?.id);
    return <WorkerDashboard userName={userName} orders={orders} inventory={inventory} automations={automations} />;
  }

  const content = await merchantContent(user?.id);
  return <DashboardLayout role={role} userName={userName} content={content} />;
}
