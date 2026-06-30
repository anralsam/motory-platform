'use client';

/**
 * UnifiedChart — VOLD MOTOR analytics engine (master controller).
 * Rigid two-zone layout: a contained header block (Metric × Timeline matrix) that is
 * statically separated in the DOM from an isolated, strictly-bounded chart canvas —
 * so the controls can never overlap or float into the Recharts surface, in RTL.
 * Reads & writes the global metric/timeline (useDashboardData) so the matrix drives
 * the whole dashboard. Layered Area+Line, three-stop gradient, dark tooltip.
 */
import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useDashboardData } from './DashboardContainer';
import { CHART_METRICS, CHART_TIMELINES, computeChartSeries } from './engine';

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

export default function UnifiedChart() {
  // Master controller — read & write the shared metric/timeline.
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

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {/* ── Rigid header block — controls only, never touches the canvas ── */}
      <div dir="rtl" className="mb-8 flex w-full flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        {/* Right (RTL): Metric matrix */}
        <div dir="rtl" className="flex flex-row items-center gap-2 rounded-xl bg-slate-100/80 p-1">
          {CHART_METRICS.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${metric === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {/* Left (RTL): Timeline pills */}
        <div dir="rtl" className="flex flex-row items-center gap-1.5 rounded-xl bg-slate-100/80 p-1">
          {CHART_TIMELINES.map((t) => (
            <button key={t.key} onClick={() => setTimeline(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${timeline === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Isolated chart canvas — strict height boundaries, LTR coordinates ── */}
      <div className="relative mt-4 block h-[360px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                <stop offset="60%" stopColor="#2563eb" stopOpacity={0.03} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} padding={{ left: 20, right: 20 }} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
            <Tooltip cursor={{ stroke: '#e2e8f0', strokeDasharray: '4 4', strokeWidth: 1.5 }} content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3.5} fill="url(#chartGradient)" isAnimationActive animationDuration={400} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3.5} dot={false} activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 3 }} isAnimationActive animationDuration={400} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
