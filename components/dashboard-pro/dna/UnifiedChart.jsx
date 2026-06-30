'use client';

/**
 * UnifiedChart — VOLD MOTOR analytics engine (master controller).
 * Two statically-separated zones: a contained header with iOS-style segmented pill
 * groups (Metric × Timeline) that clip beautifully in RTL, and a strictly-bounded,
 * isolated chart canvas below — so controls can never overlap the Recharts surface.
 * Reads & writes the global metric/timeline (useDashboardData) so the matrix drives
 * the entire dashboard. Layered Area+Line, three-stop gradient, dark tooltip, clean
 * zero-state (flat baseline grid instead of a collapsed/broken axis).
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
      {/* ── Header zone: segmented controls only ── */}
      <div dir="rtl" className="mb-8 flex w-full flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        {/* Metric pill box (RTL-right) */}
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {CHART_METRICS.map((m) => {
            const on = metric === m.key;
            return (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`rounded-lg px-4 py-1.5 text-sm transition-all ${on ? 'bg-white font-bold text-slate-900 shadow-sm' : 'font-medium text-slate-500 hover:text-slate-800'}`}>
                {m.label}
              </button>
            );
          })}
        </div>
        {/* Timeline pill box (RTL-left) */}
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {CHART_TIMELINES.map((t) => {
            const on = timeline === t.key;
            return (
              <button key={t.key} onClick={() => setTimeline(t.key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs transition-all ${on ? 'bg-blue-600 font-bold text-white shadow-sm' : 'font-medium text-slate-500 hover:text-slate-800'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Isolated canvas zone: strict 380px boundary, LTR coordinates ── */}
      <div className="mt-6 block h-[380px] w-full" dir="ltr">
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
            {/* Zero-state: keep a clean 0→10 grid instead of a collapsed axis. */}
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} allowDecimals={false}
              domain={[0, (max) => (max > 0 ? max : 10)]} tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)} />
            <Tooltip cursor={{ stroke: '#e2e8f0', strokeDasharray: '4 4', strokeWidth: 1.5 }} content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3.5} fill="url(#chartGradient)" isAnimationActive animationDuration={400} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3.5} dot={false} activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 3 }} isAnimationActive animationDuration={400} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
