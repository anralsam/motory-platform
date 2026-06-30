'use client';

/**
 * UnifiedChart — VOLD MOTOR high-fidelity analytics engine.
 * A self-contained two-axis filtering matrix (Metric × Timeline) that recomputes the
 * entire dataset instantly from the global useDashboardData context and morphs the
 * recharts paths in place — no remount, no white flash, no layout jitter.
 *
 *   Matrix A (Metric, right/RTL-start): الأرباح · المبيعات · عدد العملاء
 *   Matrix B (Timeline, left/RTL-end):  آخر يوم · آخر أسبوع · آخر شهر · آخر سنة
 *
 * Visual DNA: layered Area+Line (ComposedChart), monotone #2563eb stroke 3.5, a
 * three-stop floating gradient, zero grid/axis lines, a YouTube-Studio dark tooltip,
 * a magnetic active node and a razor dashed vertical guide. RTL shell, LTR canvas.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useDashboardData } from './DashboardContainer';
import { CHART_METRICS, CHART_TIMELINES, computeChartSeries, fmtCompact } from './engine';

const ACCENT = '#2563eb';
const EASE = [0.22, 1, 0.36, 1];

function Segmented({ items, value, onChange, activeClass }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-50 p-1">
      {items.map((it) => (
        <button key={it.key} onClick={() => onChange(it.key)}
          className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-200 ${value === it.key ? activeClass : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  const v = Number(payload[0].value) || 0;
  const text = unit === 'sar' ? `${v.toLocaleString('en-US')} ر.س` : v.toLocaleString('en-US');
  return (
    <div dir="rtl" className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-white shadow-xl shadow-black/10 backdrop-blur-md">
      <div className="mb-1 font-mono text-[11px] tracking-tight text-slate-400" dir="ltr">{label}</div>
      <div className="font-mono text-lg font-bold tabular-nums" dir="ltr">{text}</div>
    </div>
  );
}

export default function UnifiedChart() {
  // Master controller: read & WRITE the global metric/timeline so the matrix here
  // drives the entire dashboard (Hero cards + tables re-window via computeDerived).
  const ctx = useDashboardData() || {};
  const orders = ctx.orders || [];
  const metric = ctx.metric || 'revenue';
  const timeline = ctx.timeline || 'week';
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});

  const { series, unit } = useMemo(() => computeChartSeries(orders, metric, timeline), [orders, metric, timeline]);
  const axisTick = { fontSize: 11, fill: '#94a3b8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' };

  return (
    <motion.div dir="rtl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.002]">
      {/* The multi-filter control matrix */}
      <div className="mb-8 flex items-center justify-between gap-3">
        <Segmented items={CHART_METRICS} value={metric} onChange={setMetric} activeClass="bg-slate-900 text-white font-medium shadow-sm" />
        <Segmented items={CHART_TIMELINES} value={timeline} onChange={setTimeline} activeClass="bg-[#2563eb] text-white font-medium shadow-sm" />
      </div>

      {/* Floating canvas — LTR so dates/coords flow mathematically L→R */}
      <div dir="ltr" className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 12, right: 6, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="uc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
                <stop offset="50%" stopColor={ACCENT} stopOpacity={0.06} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} minTickGap={24} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={axisTick} width={46} tickFormatter={fmtCompact} />
            <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#e2e8f0', strokeDasharray: '4 4', strokeWidth: 1.5 }} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#uc-fill)" isAnimationActive animationDuration={350} animationEasing="ease-out" />
            <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={3.5} dot={false}
              activeDot={{ r: 6, fill: ACCENT, stroke: '#ffffff', strokeWidth: 3 }} isAnimationActive animationDuration={350} animationEasing="ease-out" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
