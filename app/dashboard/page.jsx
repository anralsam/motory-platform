'use client';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { useDashboard } from '@/lib/useDashboard';
import DashboardContainer from '@/components/dashboard-pro/dna/DashboardContainer';
import AnalyticsPanel from '@/components/dashboard-pro/dna/AnalyticsPanel';
import { transferWorkerBranch } from '@/app/dashboard-pro/actions';

function fmt(n) { return Number(n || 0).toLocaleString('en'); }

const ACTIVITY_TONE = {
  emerald: 'bg-emerald-100 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
};

export default function DashboardHome() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const branchName = selectedId === 'all' ? (branches.length > 1 ? 'كل الفروع' : (primary?.name || 'مركزي')) : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { loading, kpis, activity, orders, workers } = useDashboard(centerId, selectedId);

  const isOwner = myRole === 'owner';
  // W-2: revenue + customer financials are owner-only; managers see operational KPIs only.
  const CARDS = [
    { key: 'cars', label: 'سيارات اليوم', value: fmt(kpis.carsToday), accent: 'text-brand', icon: 'M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l5 5v3a2 2 0 0 1-2 2h-1 M7.5 17.5a2 2 0 1 0 0 .01 M16.5 17.5a2 2 0 1 0 0 .01', iconBg: 'bg-brand/10', iconColor: '#2563eb' },
    { key: 'rev', owner: true, label: 'دخل اليوم', value: fmt(kpis.revenueToday), suffix: 'ر.س', accent: 'text-emerald-600', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', iconBg: 'bg-emerald-50', iconColor: '#16a34a' },
    { key: 'cust', owner: true, label: 'العملاء', value: fmt(kpis.customers), accent: 'text-violet-600', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87', iconBg: 'bg-violet-50', iconColor: '#7c3aed' },
    { key: 'comp', label: 'نسبة الإنجاز', value: kpis.totalToday ? kpis.completion + '%' : '—', accent: 'text-blue-600', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3', iconBg: 'bg-blue-50', iconColor: '#2563eb', sub: kpis.totalToday ? `${fmt(kpis.completedToday)} من ${fmt(kpis.totalToday)} طلب` : 'لا طلبات اليوم' },
  ].filter((c) => isOwner || !c.owner);

  return (
    // Clean vertical stack — gap-8, full width, no clipping. (min-h-screen/bg/padding
    // are already supplied by the DashboardLayout shell, so they're not duplicated here.)
    <div className="flex w-full flex-col gap-8">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">لوحة التحكم <span className="font-medium text-slate-400">· {branchName}</span></h1>

      {isOwner ? (
        /* Owner → full Unified DNA analytics (premium cards + master chart + donut +
           top services). Financial → owner-only per W-2. */
        <DashboardContainer role="merchant" orders={orders || []} workers={workers || []} inventory={[]} actions={{ transferWorkerBranch }}>
          <AnalyticsPanel />
        </DashboardContainer>
      ) : (
        /* Manager → operational KPIs only (no financials). */
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{c.label}</span>
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${c.iconBg}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {c.icon.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
                  </svg>
                </span>
              </div>
              <div className={`mt-2 text-2xl font-extrabold tabular-nums ${c.accent}`}>
                {loading ? '—' : c.value}{c.suffix && !loading ? <span className="text-sm font-bold text-slate-400"> {c.suffix}</span> : null}
              </div>
              {c.sub && <div className="mt-1 text-[11px] font-semibold text-slate-400">{c.sub}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
          <h3 className="mb-3 text-base font-extrabold text-slate-900">آخر النشاطات</h3>
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">جاري التحميل...</div>
          ) : activity.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">لا نشاطات بعد</div>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full ${ACTIVITY_TONE[a.tone]}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{a.text}</p>
                    <p className="text-[11px] text-slate-400">{timeAgo(a.ts)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} ي`;
}
