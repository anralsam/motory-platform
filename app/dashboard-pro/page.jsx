'use client';

/**
 * VOLD MOTOR — Executive Dashboard ("Modern Executive" grid).
 * Architecture note: this is a CLIENT component by necessity — Recharts, the
 * sidebar/period toggles, and the browser Supabase client are all client-only,
 * so a React Server Component cannot render this screen. Styling is 100% Tailwind
 * utility classes (zero external/inline CSS). RTL-native, flat & razor-sharp.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabaseClient';

const MONTHS_AR = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ── Inline Lucide-style icons (no external dependency) ──
const ic = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IconGrid = (p) => (<svg {...ic} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>);
const IconStore = (p) => (<svg {...ic} {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>);
const IconClock = (p) => (<svg {...ic} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
const IconXCircle = (p) => (<svg {...ic} {...p}><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>);
const IconSettings = (p) => (<svg {...ic} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>);
const IconLogout = (p) => (<svg {...ic} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);
const IconMenu = (p) => (<svg {...ic} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
const IconUp = (p) => (<svg {...ic} width="13" height="13" {...p}><polyline points="6 15 12 9 18 15" /></svg>);
const IconDown = (p) => (<svg {...ic} width="13" height="13" {...p}><polyline points="6 9 12 15 18 9" /></svg>);
const IconAlert = (p) => (<svg {...ic} {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>);
const IconInbox = (p) => (<svg {...ic} {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>);

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

const NAV = [
  { k: 'dashboard', label: 'لوحة التحكم', Icon: IconGrid },
  { k: 'merchants', label: 'المراكز', Icon: IconStore },
  { k: 'settings', label: 'الإعدادات', Icon: IconSettings },
];

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  const [today, setToday] = useState('VOLD MOTOR');
  // status: 'loading' | 'ready' | 'empty'  (empty covers fetch-fail AND zero rows)
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);

  useEffect(() => {
    const n = new Date();
    setToday(`${DAYS_AR[n.getDay()]}، ${n.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSidebarOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Bulletproof data fetch ──
  useEffect(() => {
    let alive = true;
    async function fetchDashboardData() {
      try {
        const { data: rows, error } = await supabase.from('join_requests').select('status, created_at');
        if (error) throw error;
        if (!alive) return;
        if (!Array.isArray(rows) || rows.length === 0) {
          setStatus('empty');
          return;
        }
        const counts = { total: rows.length, approved: 0, pending: 0, rejected: 0 };
        const monthly = Array(12).fill(0);
        const year = new Date().getFullYear();
        rows.forEach((r) => {
          if (r.status === 'approved') counts.approved++;
          else if (r.status === 'pending') counts.pending++;
          else if (r.status === 'rejected') counts.rejected++;
          if (r.created_at) {
            const d = new Date(r.created_at);
            if (d.getFullYear() === year) monthly[d.getMonth()]++;
          }
        });
        setData({ ...counts, monthly: MONTHS_AR.map((label, i) => ({ label, value: monthly[i] })) });
        setStatus('ready');
      } catch {
        if (alive) setStatus('empty');
      }
    }
    fetchDashboardData();
    return () => { alive = false; };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/signin');
  }

  const ready = status === 'ready' && data;

  const insight = useMemo(() => {
    if (!ready) return null;
    const { total, approved, pending, rejected, monthly } = data;
    const last = monthly[monthly.length - 1]?.value || 0;
    const prev = monthly[monthly.length - 2]?.value || 0;
    const momDelta = prev ? Math.round(((last - prev) / prev) * 100) : last > 0 ? 100 : 0;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    return { total, approved, pending, rejected, momDelta, approvalRate: pct(approved), rejectRate: pct(rejected), pendingRate: pct(pending), thisMonth: last };
  }, [ready, data]);

  const cards = [
    { key: 'total', label: 'إجمالي الطلبات', tone: 'indigo', Icon: IconGrid, value: ready ? data.total : null, trend: insight?.momDelta, dir: (insight?.momDelta ?? 0) >= 0 ? 'up' : 'down' },
    { key: 'approved', label: 'المراكز المفعّلة', tone: 'emerald', Icon: IconStore, value: ready ? data.approved : null, trend: insight?.approvalRate, dir: 'up' },
    { key: 'pending', label: 'الطلبات المعلّقة', tone: 'amber', Icon: IconClock, value: ready ? data.pending : null, trend: insight?.pendingRate, dir: (data?.pending ?? 0) > 0 ? 'down' : 'up' },
    { key: 'rejected', label: 'الطلبات المرفوضة', tone: 'rose', Icon: IconXCircle, value: ready ? data.rejected : null, trend: insight?.rejectRate, dir: 'down' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ══ SIDEBAR (fixed, right, dark) ══ */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-40 flex w-[260px] flex-col bg-[#0B0B0B] text-white transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5" dir="ltr">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M6 10 L24 42 L42 10" stroke="url(#xg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="xg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FAFAFA" /><stop offset=".55" stopColor="#6366f1" /><stop offset="1" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-wide">VOLD <span className="text-indigo-400">MOTOR</span></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Executive</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">القائمة</div>
          {NAV.map(({ k, label, Icon }) => {
            const on = activeNav === k;
            return (
              <button
                key={k}
                onClick={() => { setActiveNav(k); setSidebarOpen(false); }}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm font-bold transition-colors duration-[180ms] ${
                  on ? 'bg-indigo-600/20 text-white' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                {on && <span className="absolute right-0 top-1.5 bottom-1.5 w-[3px] rounded-l bg-indigo-500" />}
                <Icon width="17" height="17" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-black">V</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">المدير</div>
            <div className="text-xs text-white/45">Super Admin</div>
          </div>
          <button onClick={logout} title="خروج" className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/50 transition-colors hover:border-indigo-400 hover:text-indigo-400">
            <IconLogout width="15" height="15" />
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="flex min-h-screen flex-col lg:mr-[260px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e4e4e7] bg-white/90 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e4e4e7] text-zinc-500 lg:hidden" aria-label="القائمة">
              <IconMenu width="18" height="18" />
            </button>
            <div>
              <div className="text-[15px] font-extrabold leading-tight">نظرة عامة</div>
              <div className="text-xs font-medium text-zinc-500">{today}</div>
            </div>
          </div>
          <button className="rounded-lg border border-[#e4e4e7] bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
            تصدير التقرير
          </button>
        </header>

        {/* Content grid */}
        <main className="flex-1 space-y-5 p-5 lg:p-8">
          {/* ── Row 1: 4 stat cards ── */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <div key={c.key} className="flex flex-col gap-4 rounded-2xl border border-[#e4e4e7] bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-500">{c.label}</span>
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONES[c.tone]}`}><c.Icon width="18" height="18" /></span>
                </div>
                <div className="flex items-end justify-between gap-2">
                  {c.value === null ? (
                    status === 'loading'
                      ? <span className="h-7 w-16 animate-pulse rounded bg-zinc-100" />
                      : <span className="font-inter text-2xl font-bold text-zinc-300" dir="ltr">—</span>
                  ) : (
                    <span className="font-inter text-3xl font-bold tabular-nums tracking-tight text-zinc-900" dir="ltr">
                      {c.value.toLocaleString('en-US')}
                    </span>
                  )}
                  {ready && Number.isFinite(c.trend) && (
                    <span dir="ltr" className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                      c.dir === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {c.dir === 'up' ? <IconUp /> : <IconDown />}
                      {Math.abs(c.trend)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* ── Row 2: Hero chart (2/3) + Master Insights (1/3) ── */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Hero growth chart */}
            <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 lg:col-span-2">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">اتجاه النمو</h3>
                  <p className="mt-1 text-xs font-medium text-zinc-500">طلبات الانضمام الجديدة على مدار العام</p>
                </div>
                <div className="flex gap-1 rounded-lg border border-[#e4e4e7] bg-zinc-50 p-1">
                  {[['month', 'شهري'], ['year', 'سنوي']].map(([k, lbl]) => (
                    <button key={k} onClick={() => setPeriod(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-[180ms] ${
                      period === k ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                    }`}>{lbl}</button>
                  ))}
                </div>
              </div>
              {ready ? (
                <div className="h-[280px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} interval={0} tickMargin={8} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} width={30} />
                      <Tooltip cursor={{ fill: 'rgba(79,70,229,.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }} labelStyle={{ fontWeight: 700 }} formatter={(v) => [v, 'طلب']} />
                      <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState loading={status === 'loading'} />
              )}
            </div>

            {/* Master Insights */}
            <div className="rounded-2xl border border-[#e4e4e7] bg-white p-6 lg:col-span-1">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">نظرة عميقة</div>
              {ready ? (
                <div className="divide-y divide-[#e4e4e7]">
                  <Insight label="نمو هذا الشهر">
                    <span dir="ltr" className={`inline-flex items-center gap-1 font-inter text-xl font-bold tabular-nums ${insight.momDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {insight.momDelta >= 0 ? <IconUp /> : <IconDown />}{Math.abs(insight.momDelta)}%
                    </span>
                  </Insight>
                  <Insight label="معدل القبول">
                    <span dir="ltr" className="font-inter text-xl font-bold tabular-nums text-zinc-900">{insight.approvalRate}%</span>
                  </Insight>
                  <Insight label="نسبة الرفض">
                    <span dir="ltr" className="font-inter text-xl font-bold tabular-nums text-zinc-900">{insight.rejectRate}%</span>
                  </Insight>
                  {/* Status alert */}
                  {insight.pending > 0 ? (
                    <div className="flex items-start gap-2 pt-4 text-rose-600">
                      <IconAlert width="16" height="16" />
                      <span className="text-sm font-semibold leading-snug">{insight.pending.toLocaleString('en-US')} طلبات بانتظار المراجعة</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 pt-4 text-emerald-600">
                      <IconUp /><span className="text-sm font-semibold leading-snug">لا توجد طلبات معلّقة — كل شيء محدّث</span>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState loading={status === 'loading'} compact />
              )}
            </div>
          </section>

          {/* ── Row 3 (footer): minor metric cards ── */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <MiniCard label="طلبات هذا الشهر" value={ready ? insight.thisMonth : null} loading={status === 'loading'} suffix="طلب" />
            <MiniCard label="معدل القبول" value={ready ? insight.approvalRate : null} loading={status === 'loading'} suffix="%" tone="emerald" />
            <MiniCard label="نسبة الرفض" value={ready ? insight.rejectRate : null} loading={status === 'loading'} suffix="%" tone="rose" />
          </section>
        </main>
      </div>
    </div>
  );
}

function Insight({ label, children }) {
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-3">
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

function MiniCard({ label, value, loading, suffix, tone }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : 'text-zinc-900';
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#e4e4e7] bg-white p-5">
      <span className="text-sm font-semibold text-zinc-500">{label}</span>
      {value === null ? (
        loading
          ? <span className="h-6 w-12 animate-pulse rounded bg-zinc-100" />
          : <span className="font-inter text-lg font-bold text-zinc-300" dir="ltr">—</span>
      ) : (
        <span dir="ltr" className={`font-inter text-2xl font-bold tabular-nums ${color}`}>
          {value.toLocaleString('en-US')}<span className="mr-1 text-sm font-semibold text-zinc-400">{suffix}</span>
        </span>
      )}
    </div>
  );
}

// Integrated "No Data Available" state (never bare 0s).
function EmptyState({ loading, compact }) {
  if (loading) {
    return <div className={`flex items-center justify-center rounded-xl bg-zinc-50 ${compact ? 'h-40' : 'h-[280px]'}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-500" />
    </div>;
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#e4e4e7] bg-zinc-50/60 text-center ${compact ? 'h-40 p-4' : 'h-[280px] p-6'}`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-300 ring-1 ring-[#e4e4e7]"><IconInbox width="22" height="22" /></span>
      <div>
        <div className="text-sm font-bold text-zinc-700">لا توجد بيانات متاحة</div>
        <div className="mt-1 text-xs text-zinc-400">لم نتمكّن من جلب البيانات أو لا توجد سجلات بعد</div>
      </div>
    </div>
  );
}
