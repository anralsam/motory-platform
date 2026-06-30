'use client';

/**
 * AnalyticsPanel — VOLD MOTOR analytics cockpit (YouTube-Studio parity).
 * Shared verbatim by /dashboard (owner) and /dashboard-pro (merchant).
 * 2-column layout: a 3/4 main column (context statement → nav tabs → connected
 * summary grid → floating chart → lower analytics) and a 1/4 real-time sidebar.
 * Clicking a summary card shifts the master metric; the timeline pills shift the
 * window — both flow through useDashboardData so the whole dashboard re-derives.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardData } from './DashboardContainer';
import UnifiedChart from './UnifiedChart';
import { fmtValue, computeComparisons, CHART_TIMELINES } from './engine';

const TABS = [['overview', 'نظرة عامة'], ['content', 'المحتوى'], ['audience', 'الجمهور'], ['revenue', 'الإيرادات']];

const SUMMARY = [
  { key: 'sales', label: 'العمليات', unit: 'int' },
  { key: 'revenue', label: 'الإيراد', unit: 'sar' },
  { key: 'customers', label: 'العملاء', unit: 'int' },
];

export default function AnalyticsPanel() {
  const ctx = useDashboardData() || {};
  const { orders = [], kpis = {}, statusDist = [], topServices = [], windowCount = 0, metric = 'revenue', timeline = 'week' } = ctx;
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});
  const [tab, setTab] = useState('overview');

  const comp = useMemo(() => computeComparisons(orders, timeline), [orders, timeline]);
  const periodText = comp.days === 1 ? 'اليوم' : `آخر ${comp.days} يومًا`;

  // Live 48-hour micro-bars (orders created per hour).
  const bars = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 48 }, (_, i) => {
      const s = now - (47 - i) * 3600000;
      const e = s + 3600000;
      return orders.filter((o) => { const t = o.created_at ? new Date(o.created_at).getTime() : 0; return t >= s && t < e; }).length;
    });
  }, [orders]);
  const maxBar = Math.max(1, ...bars);

  return (
    <div className="grid w-full grid-cols-1 items-start gap-6 xl:grid-cols-4">
      {/* ══ Main column (3/4) ══ */}
      <div className="space-y-6 xl:col-span-3">
        {/* Context statement + timeline */}
        <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="text-lg font-bold leading-snug text-[#0f172a]">
            حصدت مركزك <span className="font-mono tabular-nums" dir="ltr">{comp.sales.value}</span> عملية خلال {periodText}.
          </div>
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {CHART_TIMELINES.map((t) => {
              const on = timeline === t.key;
              return (
                <button key={t.key} onClick={() => setTimeline(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-all ${on ? 'bg-blue-600 font-bold text-white shadow-sm' : 'font-medium text-slate-500 hover:text-slate-800'}`}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200">
          {TABS.map(([k, label]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)} className="relative -mb-px pb-3 pt-1">
                <span className={`text-sm transition-colors ${on ? 'font-bold text-slate-900' : 'font-medium text-slate-500 hover:text-slate-800'}`}>{label}</span>
                {on && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-slate-900" />}
              </button>
            );
          })}
        </div>

        {tab === 'overview' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="space-y-6">
            {/* Connected summary grid */}
            <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-[#fafafa]/50 md:grid-cols-3">
              {SUMMARY.map((c, i) => {
                const d = comp[c.key];
                const on = metric === c.key;
                const up = d.growth >= 0;
                const Arrow = up ? ArrowUpRight : ArrowDownRight;
                return (
                  <button key={c.key} onClick={() => setMetric(c.key)}
                    className={`relative p-6 text-start transition-colors ${i > 0 ? 'border-slate-200 md:border-e' : ''} ${on ? 'bg-white' : 'hover:bg-white/60'}`}>
                    <div className="text-sm font-medium text-slate-500">{c.label}</div>
                    <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums" dir="ltr">
                      {c.unit === 'sar' ? fmtValue(d.value, 'sar') : d.value.toLocaleString('en-US')}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`} dir="ltr">
                        <Arrow size={12} strokeWidth={2.5} />{Math.abs(d.growth)}%
                      </span>
                      <span>{up ? 'أكثر' : 'أقل'} مقارنة بالأيام الـ {comp.days} السابقة</span>
                    </div>
                    {on && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#2563eb]" />}
                  </button>
                );
              })}
            </div>

            {/* Floating chart */}
            <UnifiedChart />

            {/* Lower analytics: status donut + top services */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
                <div className="text-base font-bold tracking-tight text-slate-900">توزيع الحالات</div>
                <div className="mt-1 mb-6 text-xs font-medium text-slate-500">إجمالي {windowCount.toLocaleString('en-US')} طلب</div>
                {statusDist.length ? (
                  <>
                    <div className="relative mx-auto h-40 w-40" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={3} strokeWidth={0} cornerRadius={6}>
                            {statusDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }} formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-2xl font-bold tabular-nums text-slate-900" dir="ltr">{windowCount}</span>
                        <span className="text-[10px] font-medium text-slate-400">طلب</span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2.5">
                      {statusDist.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                          <span className="font-mono font-bold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-sm text-slate-400">لا توجد بيانات ضمن النطاق</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="text-base font-bold tracking-tight text-slate-900">أفضل الخدمات</div>
                <div className="mt-1 mb-6 text-xs font-medium text-slate-500">الأكثر طلباً مع إيرادها</div>
                {topServices.length ? (
                  <div className="space-y-5">
                    {topServices.map((s, i) => {
                      const maxSvc = topServices[0]?.count || 1;
                      return (
                        <div key={s.name + i}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2.5 font-semibold text-slate-700">
                              <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-500" dir="ltr">{i + 1}</span>
                              {s.name}
                            </span>
                            <span className="flex items-center gap-4">
                              <span className="text-xs font-medium text-slate-400">{s.count} طلب</span>
                              <span className="font-mono font-bold tabular-nums text-slate-900" dir="ltr">{fmtValue(s.revenue, 'sar')}</span>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(5, Math.round((s.count / maxSvc) * 100))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-sm text-slate-400">لا توجد خدمات ضمن النطاق</div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-24 text-center shadow-sm">
            <div className="text-base font-bold text-slate-900">{TABS.find(([k]) => k === tab)?.[1]}</div>
            <div className="mt-1 text-sm text-slate-400">هذا القسم قيد الإعداد.</div>
          </div>
        )}
      </div>

      {/* ══ Real-time sidebar (1/4) ══ */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-bold text-slate-900">الوقت الفعلي</span>
        </div>
        <div className="mt-5 text-xs font-medium text-slate-500">سيارات داخل المركز الآن</div>
        <div className="mt-1 font-mono text-4xl font-black tabular-nums text-slate-900" dir="ltr">{kpis.live || 0}</div>

        <div className="mt-6 text-xs font-medium text-slate-500">أداء آخر 48 ساعة</div>
        <div className="mt-3 flex h-24 items-end gap-px" dir="ltr">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-sm bg-blue-500/70 transition-all" style={{ height: `${Math.max(4, Math.round((b / maxBar) * 100))}%` }} title={`${b}`} />
          ))}
        </div>
      </aside>
    </div>
  );
}
