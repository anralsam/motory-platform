'use client';

/**
 * UnifiedChart — VOLD MOTOR master analytics chart (YouTube-Analytics parity).
 * Header (when `showControls`): a YT-style context headline ("حصدت منصتك X خلال
 * آخر N يومًا") + the current metric total with growth vs the previous window,
 * and the Metric × Timeline filters as compact DROPDOWNS (FilterSelect) — never
 * open pill rows on the canvas. Below: a plain white panel, no vertical grid,
 * light dashed horizontal markers, a thin 2px monotone curve and a faint
 * gradient — the day sequence on the X axis exactly like Studio.
 */
import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardData } from './DashboardContainer';
import FilterSelect from './FilterSelect';
import { CHART_METRICS, CHART_TIMELINES, NET_METRIC, computeChartSeries, computeComparisons, timelineRangeText, fmtValue } from './engine';

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0].value) || 0;
  const text = unit === 'sar' ? `${v.toLocaleString('en-US')} ⃁` : v.toLocaleString('en-US');
  return (
    <div dir="rtl" className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-sm font-medium text-white shadow-xl">
      <div className="mb-1 font-mono text-xs text-slate-400" dir="ltr">{label}</div>
      <div className="font-mono text-base font-bold tabular-nums" dir="ltr">{text}</div>
    </div>
  );
}

export default function UnifiedChart({ showControls = false, bare = false }) {
  const ctx = useDashboardData() || {};
  const orders = ctx.orders || [];
  const expenses = ctx.expenses || [];
  const metric = ctx.metric || 'revenue';
  const timeline = ctx.timeline || 'week';
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});

  // Opt-in: the net-profit tab appears only on surfaces that actually carry
  // expenses in context, so existing dashboards keep the exact four-tab strip.
  const metrics = useMemo(
    () => (expenses.length ? [...CHART_METRICS, NET_METRIC] : CHART_METRICS),
    [expenses.length],
  );

  const { data, unit } = useMemo(() => {
    const r = computeChartSeries(orders, metric, timeline, expenses);
    return { data: r.series, unit: r.unit };
  }, [orders, metric, timeline, expenses]);

  // YT-style headline: window total for the ACTIVE metric + growth vs previous window.
  const comp = useMemo(() => computeComparisons(orders, timeline, expenses), [orders, timeline, expenses]);
  const rangeText = useMemo(() => timelineRangeText(timeline, orders), [timeline, orders]);
  const head = useMemo(() => {
    const key = ['revenue', 'profit', 'customers', 'sales', 'net'].includes(metric) ? metric : 'revenue';
    const { value } = comp[key] || { value: 0 };
    const metricLabel = (metrics.find((m) => m.key === metric) || metrics[0]).label;
    const unit = (metrics.find((m) => m.key === metric) || metrics[0]).unit;
    const period = comp.allTime ? 'كامل المدة' : comp.days === 1 ? 'آخر ٢٤ ساعة' : comp.days === 7 ? 'آخر ٧ أيام' : comp.days === 30 ? 'آخر ٣٠ يومًا' : 'آخر ١٢ شهرًا';
    return { fmt: fmtValue(value, unit), metricLabel, period };
  }, [comp, metric, metrics]);

  const shell = bare
    ? 'w-full px-4 pb-5 pt-2 sm:px-6'
    : 'w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8';
  return (
    <div className={shell}>
      {showControls && (
        <div dir="rtl" className="mb-4">
          {/* Headline + period (with the ACTUAL date range — YT parity) */}
          <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="text-base font-bold leading-snug text-slate-900 md:text-lg">
              حصدت المنصة <span className="tabular-nums" dir="ltr">{head.fmt}</span> خلال {head.period}.
            </div>
            <div className="flex flex-none flex-col items-end gap-1">
              <FilterSelect label="الفترة" options={CHART_TIMELINES} value={timeline} onChange={setTimeline} />
              <span className="text-[11px] font-semibold text-slate-400">{rangeText}</span>
            </div>
          </div>

          {/* Metric tabs — YouTube Studio exact: label / number / delta per tab */}
          <div className={`mt-5 grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 overflow-hidden rounded-t-2xl border border-b-0 border-slate-200 ${metrics.length > 4 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
            {metrics.map((m) => {
              const d = comp[m.key] || { value: 0, growth: 0 };
              const on = metric === m.key;
              const up = (d.growth || 0) >= 0;
              return (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`relative px-4 py-4 text-center transition-colors sm:py-5 ${on ? 'bg-white' : 'bg-slate-50/70 hover:bg-white'}`}>
                  <div className={`text-[12px] ${on ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>{m.label}</div>
                  <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${on ? 'text-slate-900' : 'text-slate-400'}`} dir="ltr">
                    {fmtValue(d.value, m.unit)}
                  </div>
                  {!comp.allTime && (
                    <div className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(d.growth || 0)}%
                    </div>
                  )}
                  {on && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Isolated canvas — strict height boundary, LTR coordinates */}
      <div className="mt-2 block h-[360px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.12} />
                <stop offset="70%" stopColor="#2563eb" stopOpacity={0.02} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} horizontal stroke="#eceef1" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} tick={{ fill: '#606060', fontSize: 12, fontWeight: 500 }} padding={{ left: 16, right: 16 }} minTickGap={28} />
            <YAxis axisLine={false} tickLine={false} tickMargin={6} tickCount={5} tick={{ fill: '#606060', fontSize: 12, fontWeight: 500 }} allowDecimals={false}
              domain={[0, (max) => (max > 0 ? max : 10)]} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
            <Tooltip cursor={{ stroke: '#e2e8f0', strokeDasharray: '4 4', strokeWidth: 1.5 }} content={<CustomTooltip unit={unit} />} />
            <Area type="linear" dataKey="value" stroke="none" fill="#e3f2fd" fillOpacity={1} isAnimationActive animationDuration={350} />
            <Line type="linear" dataKey="value" stroke="#1a73e8" strokeWidth={2} dot={false} activeDot={{ r: 4.5, fill: '#1a73e8', stroke: '#ffffff', strokeWidth: 2 }} isAnimationActive animationDuration={350} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
