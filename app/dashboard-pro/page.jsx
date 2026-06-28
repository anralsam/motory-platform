/**
 * VOLD MOTOR — Dashboard Pro (Server Component).
 * Data is fetched server-side (service-role) via lib/dashboard-pro/queries — logic
 * is fully separated from these presentational modules. Role-based composition,
 * handed to the client <DashboardShell> (sidebar + mobile bottom-nav + i18n).
 * Design system: bg-white · border-slate-100 · rounded-2xl · shadow-sm · Inter.
 */
import { Wallet, Wrench, Gauge, Activity, AlertTriangle, PackageCheck } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getAdminData, getMerchantData, getWorkerData, getIntelligenceData } from '@/lib/dashboard-pro/queries';
import DashboardShell from '@/components/dashboard-pro/DashboardShell';
import AcceptanceTable from '@/components/dashboard-pro/AcceptanceTable';
import AssignControl from '@/components/dashboard-pro/AssignControl';
import WorkerModule from '@/components/dashboard-pro/WorkerModule';
import IntelligenceModule from '@/components/dashboard-pro/IntelligenceModule';
import StatTile from '@/components/dashboard-pro/StatTile';
import StatusPill from '@/components/dashboard-pro/StatusPill';
import NoData from '@/components/dashboard-pro/NoData';

export const dynamic = 'force-dynamic';

const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';
const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

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

// ── Admin · Global Fleet Health ──
async function renderAdminModule() {
  const d = await getAdminData();
  if (!d) {
    return <NoData hint="فعّل SUPABASE_SERVICE_ROLE_KEY في Vercel لعرض البيانات الحقيقية، أو لا توجد بيانات بعد." />;
  }
  const intel = (await getIntelligenceData()) || { orders: [], workers: [], branches: [] };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Wallet} tone="emerald" label="إجمالي الإيراد" value={sar(d.fleet.revenue)} sub="من الطلبات المكتملة" />
        <StatTile icon={Wrench} tone="indigo" label="الفنّيون النشطون" value={d.fleet.activeMechanics.toLocaleString('en-US')} sub="عبر كل المراكز" />
        <StatTile icon={Gauge} tone="amber" label="الكفاءة" value={`${d.fleet.efficiencyPct}%`} sub={`${d.fleet.activeOrders} طلب قيد التنفيذ`} />
      </div>

      {/* Intelligence Module — predictive analytics */}
      <IntelligenceModule orders={intel.orders} workers={intel.workers} branches={intel.branches} />

      <div>
        <div className="mb-3 text-sm font-semibold text-slate-900">طلبات الانضمام · {d.joinStats.pending} بانتظار المراجعة</div>
        <AcceptanceTable initialRows={d.acceptanceRows} />
      </div>
    </div>
  );
}

// ── Merchant · Command Center ──
async function renderShopModule(merchantId) {
  const d = await getMerchantData(merchantId);
  if (!d || d.empty) {
    return <NoData title="لا توجد طلبات" hint="لا توجد طلبات ورشة على حسابك بعد." />;
  }
  const nameByUser = Object.fromEntries(d.workers.map((w) => [w.user_id, w.full_name]));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Activity} tone="indigo" label="طلبات حيّة الآن" value={d.perf.live.toLocaleString('en-US')} sub={`${d.perf.bookings} إجمالي الحجوزات`} />
        <StatTile icon={Gauge} tone="emerald" label="استغلال الفنيين" value={`${d.perf.utilization}%`} sub="نسبة الطلبات النشطة" />
        <StatTile icon={AlertTriangle} tone={d.stockAlerts.length ? 'rose' : 'slate'} label="تنبيهات المخزون" value={d.stockAlerts.length.toLocaleString('en-US')} sub="أصناف تحت الحد الأدنى" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Stock alerts */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <AlertTriangle size={16} className="text-amber-500" /> تنبيهات المخزون
          </div>
          {d.stockAlerts.length ? (
            <div className="space-y-3">
              {d.stockAlerts.map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <span className="text-sm font-normal text-slate-600">{i.name}</span>
                  <span className="font-inter text-sm font-semibold tabular-nums text-rose-600" dir="ltr">{i.quantity} {i.unit || ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-normal text-emerald-600">
              <PackageCheck size={16} /> كل الأصناف ضمن الحد الآمن
            </div>
          )}
        </div>

        {/* Task assignment — card-grid of order mini-dashboards */}
        <div className="lg:col-span-2">
          <div className="mb-4 text-sm font-semibold text-slate-900">تكليف المهام</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {d.orders.slice(0, 12).map((o) => (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-400" dir="ltr">#{String(o.id).slice(0, 8)}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{o.customer_name || 'عميل'}</div>
                <div className="mb-4 text-xs font-normal text-slate-400">
                  {[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}
                  {o.plate ? <span dir="ltr"> · {o.plate}</span> : null}
                </div>
                {o.assigned_to ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {nameByUser[o.assigned_to] || 'فنّي'}
                  </span>
                ) : (
                  <AssignControl orderId={o.id} workers={d.workers} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  let moduleNode;
  if (role === 'admin') {
    moduleNode = await renderAdminModule();
  } else if (role === 'worker') {
    const { orders, inventory } = await getWorkerData(user?.id);
    moduleNode = <WorkerModule orders={orders} inventory={inventory} />;
  } else {
    moduleNode = await renderShopModule(user?.id);
  }

  return (
    <DashboardShell role={role} userName={userName}>
      {moduleNode}
    </DashboardShell>
  );
}
