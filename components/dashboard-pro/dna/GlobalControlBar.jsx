'use client';

/**
 * GlobalControlBar — administrative layout strip ONLY.
 * The metric/timeline filtering now lives inside the UnifiedChart matrix (the master
 * controller), so this bar carries no duplicate toggles — it exists purely to host
 * role-specific actions (headerActions) and a contextual role label. It is rendered
 * by DashboardContainer only when headerActions are provided.
 */
import { useDashboardData } from './DashboardContainer';

const ROLE_LABEL = { admin: 'لوحة المنصة', merchant: 'لوحة المركز', worker: 'مهامي' };

export default function GlobalControlBar({ headerActions }) {
  const { role } = useDashboardData();
  return (
    <div dir="rtl" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="text-sm font-bold tracking-tight text-slate-900">{ROLE_LABEL[role] || ''}</span>
      <div className="flex items-center gap-2">{headerActions}</div>
    </div>
  );
}
