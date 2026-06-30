'use client';

/**
 * GlobalControlBar — the brain's control surface. Sits below the header and drives
 * the ENTIRE dashboard state: time range + active metric. Role-aware label/actions.
 * Any change flips the shared context, which re-derives every chart/table below.
 */
import { useDashboardData } from './DashboardContainer';
import { RANGES, METRICS, METRICS_BY_ROLE } from './engine';

const ROLE_LABEL = { admin: 'صحة النظام', merchant: 'الإيراد', worker: 'المهام' };

function Segmented({ items, value, onChange, activeClass }) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
      {items.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${value === k ? activeClass : 'text-secondary hover:text-slate-700'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function GlobalControlBar({ headerActions }) {
  const { role, range, setRange, metric, setMetric } = useDashboardData();
  const metricItems = (METRICS_BY_ROLE[role] || ['revenue']).map((k) => [k, METRICS[k].label]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented items={RANGES.map((r) => [r.key, r.label])} value={range} onChange={setRange} activeClass="bg-white text-slate-900 shadow-sm" />
        <Segmented items={metricItems} value={metric} onChange={setMetric} activeClass="bg-accent text-white shadow-sm" />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-secondary sm:inline">{ROLE_LABEL[role] || ''}</span>
        {headerActions}
      </div>
    </div>
  );
}
