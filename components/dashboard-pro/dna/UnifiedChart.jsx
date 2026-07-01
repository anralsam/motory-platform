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
import { CHART_METRICS, CHART_TIMELINES, computeChartSeries, computeComparisons } from './engine';

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0].value) || 0;
  const text = unit === 'sar' ? `${v.toLocaleString('en-US')} ر.س` : v.toLocaleString('en-US');
  return (
    <div dir="rtl" className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 text-sm font-medium text-white shadow-xl">
      <div className="mb-1 font-mono text-xs text-slate-400" dir="ltr">{label}</div>
      <div className="font-mono text-base font-bold tabular-nums" dir="ltr">{text}</div>
    </div>
  );
}

export default function UnifiedChart({ showControls = false }) {
  const ctx = useDashboardData() || {};
  const orders = ctx.orders || [];
  const metric = ctx.metric || 'revenue';
  const timeline = ctx.timeline || 'week';
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});

  const { data, unit } = useMemo(() => {
    const r = computeChartSeries(orders, metric, timeline);
    return { data: r.series, unit: r.unit };
  }, [orders, metric, timeline]);

  // YT-style headline: window total for the ACTIVE metric + growth vs previous window.
  const head = useMemo(() => {
    const comp = computeComparisons(orders, timeline);
    const key = metric === 'revenue' ? 'revenue' : metric === 'customers' ? 'customers' : 'sales';
    const { value, growth } = comp[key] || { value: 0, growth: 0 };
    const metricLabel = (CHART_METRICS.find((m) => m.key === metric) || {}).label || '';
    const period = comp.days === 1 ? 'آخر ٢٤ ساعة' : comp.days === 7 ? 'آخر ٧ أيام' : comp.days === 30 ? 'آخر ٣٠ يومًا' : 'آخر ١٢ شهرًا';
    const fmt = unit === 'sar' ? `${(Number(value) || 0).toLocaleString('en-US')} ﷼` : (Number(value) || 0).toLocaleString('en-US');
    return { metricLabel, period, fmt, growth };
  }, [orders, metric, timeline, unit]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {showControls && (
        <div dir="rtl" className="mb-6 flex w-full flex-col items-start justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start">
          {/* Context headline — Studio parity */}
          <div>
            <div className="text-base font-bold leading-snug text-slate-900 md:text-lg">
              حصدت المنصة <span className="font-mono tabular-nums" dir="ltr">{head.fmt}</span>
              <span className="mx-1">{head.metricLabel === 'الأرباح' ? 'أرباحًا' : ''}</span>
              خلال {head.period}.
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
              {head.growth >= 0
                ? <span className="inline-flex items-center gap-0.5 text-emerald-600"><ArrowUpRight size={14} /><span dir="ltr">{head.growth}%</span></span>
                : <span className="inline-flex items-center gap-0.5 text-rose-600"><ArrowDownRight size={14} /><span dir="ltr">{Math.abs(head.growth)}%</span></span>}
              <span className="font-medium text-slate-400">مقارنةً بالفترة السابقة</span>
            </div>
          </div>

          {/* Filters — compact dropdowns, never open pill rows */}
          <div className="flex flex-none items-center gap-2">
            <FilterSelect label="المقياس" options={CHART_METRICS} value={metric} onChange={setMetric} />
            <FilterSelect label="الفترة" options={CHART_TIMELINES} value={timeline} onChange={setTimeline} />
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
            <CartesianGrid vertical={false} horizontal strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} padding={{ left: 20, right: 20 }} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} allowDecimals={false}
              domain={[0, (max) => (max > 0 ? max : 10)]} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
            <Tooltip cursor={{ stroke: '#e2e8f0', strokeDasharray: '4 4', strokeWidth: 1.5 }} content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#chartGradient)" isAnimationActive animationDuration={400} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2.5 }} isAnimationActive animationDuration={400} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
