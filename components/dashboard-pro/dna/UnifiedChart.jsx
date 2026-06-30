'use client';

/**
 * UnifiedChart — the single 'Master Chart' for the whole platform. Smart component:
 * reads the global filter context for the active metric + time-bucketed series, and
 * renders one high-fidelity recharts area with the strict #2563eb→transparent gradient.
 * `filterType` pins a metric (revenue/orders/technicians/efficiency); omit it to follow
 * the Global Control Bar's metric toggle. framer-motion re-animates on every change.
 */
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useDashboardData } from './DashboardContainer';
import { ACCENT, METRICS, RANGES, fmtValue } from './engine';

export default function UnifiedChart({ filterType, title = 'تحليل الأداء', height = 320 }) {
  const ctx = useDashboardData();
  const metricKey = filterType || ctx.metric;
  const m = METRICS[metricKey] || METRICS.revenue;
  const rangeLabel = (RANGES.find((r) => r.key === ctx.range) || {}).label || '';
  const gid = `uchart-${metricKey}`;
  const yFmt = (v) => (m.unit === 'sar' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : m.unit === 'pct' ? `${v}%` : v);

  return (
    <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-bold tracking-tight text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-medium text-secondary">{m.label} · {rangeLabel}</div>
        </div>
      </div>
      <motion.div key={`${metricKey}-${ctx.range}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} dir="ltr" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ctx.series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
                <stop offset="75%" stopColor={ACCENT} stopOpacity={0.04} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={42} tickFormatter={yFmt} />
            <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }}
              formatter={(v) => [fmtValue(v, m.unit), m.label]} />
            <Area type="monotone" dataKey={metricKey} stroke={ACCENT} strokeWidth={3} fill={`url(#${gid})`} dot={false} activeDot={{ r: 5, fill: ACCENT, stroke: '#fff', strokeWidth: 2.5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
