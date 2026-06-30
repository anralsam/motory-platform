/**
 * Grand Unified DNA — pure data engine (no React, no UI).
 * One place computes EVERY derived dataset the dashboards render: the time-bucketed
 * series for the master chart, the role KPIs, status distribution and top services —
 * all reactive to the active time-range. Shared by Admin / Merchant / Worker so the
 * three surfaces are guaranteed to agree on the numbers.
 */

// Single source of truth for the accent (recharts needs a real color string; this is
// the ONE allowed reference — components pull className colors from tailwind tokens).
export const ACCENT = '#2563eb';

export const MONTHS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];

export const RANGES = [
  { key: '7d', label: '٧ أيام', days: 7 },
  { key: '30d', label: '٣٠ يوم', days: 30 },
  { key: 'ytd', label: 'هذا العام', days: null },
];

// filterType → how the master chart + metric toggle read the series.
export const METRICS = {
  revenue: { key: 'revenue', label: 'الإيراد', unit: 'sar' },
  orders: { key: 'orders', label: 'العمليات', unit: 'int' },
  technicians: { key: 'technicians', label: 'الفنّيون', unit: 'int' },
  efficiency: { key: 'efficiency', label: 'الكفاءة', unit: 'pct' },
  stock: { key: 'stock', label: 'المخزون', unit: 'int' },
};

// Which metrics each role exposes on the Global Control Bar.
export const METRICS_BY_ROLE = {
  admin: ['revenue', 'orders', 'efficiency'],
  merchant: ['revenue', 'orders', 'efficiency'],
  worker: ['orders', 'technicians'],
};

export const defaultMetricFor = (role) => (METRICS_BY_ROLE[role] || ['revenue'])[0];

const STATUS_META = [
  { key: 'pending', name: 'انتظار', color: '#f59e0b' },
  { key: 'in_progress', name: 'جاري', color: '#2563eb' },
  { key: 'ready', name: 'جاهز', color: '#7c3aed' },
  { key: 'completed', name: 'مكتمل', color: '#10b981' },
];

export const fmtValue = (v, unit) => {
  const n = Number(v) || 0;
  if (unit === 'sar') return `${n.toLocaleString('en-US')} ﷼`;
  if (unit === 'pct') return `${n}%`;
  return n.toLocaleString('en-US');
};

/**
 * Compute every derived dataset for a given raw orders set + time range.
 * Runs client-side (live filter response with zero network round-trips).
 */
export function computeDerived(orders = [], workers = [], range = '30d') {
  const now = new Date();
  const R = RANGES.find((r) => r.key === range) || RANGES[1];

  // Build the time buckets (daily for 7/30d, monthly for YTD).
  const buckets = [];
  if (R.days) {
    for (let i = R.days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ key: d.toISOString().slice(0, 10), label: `${d.getDate()}/${d.getMonth() + 1}` });
    }
  } else {
    for (let m = 0; m <= now.getMonth(); m++) buckets.push({ key: `m${m}`, label: MONTHS[m], month: m });
  }
  const indexByKey = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  const windowStart = R.days ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (R.days - 1)) : new Date(now.getFullYear(), 0, 1);

  const acc = buckets.map(() => ({ revenue: 0, orders: 0, completed: 0, total: 0, techs: new Set() }));
  const inWindow = [];
  orders.forEach((o) => {
    if (!o.created_at) return;
    const dt = new Date(o.created_at);
    if (dt < windowStart) return;
    inWindow.push(o);
    const idx = R.days ? indexByKey[dt.toISOString().slice(0, 10)] : dt.getMonth();
    if (idx == null || idx < 0 || idx >= acc.length) return;
    const a = acc[idx];
    a.orders++; a.total++;
    if (o.status === 'completed') { a.revenue += Number(o.price) || 0; a.completed++; }
    if (o.assigned_to) a.techs.add(o.assigned_to);
  });

  const series = buckets.map((b, i) => ({
    label: b.label,
    revenue: acc[i].revenue,
    orders: acc[i].orders,
    technicians: acc[i].techs.size,
    efficiency: acc[i].total ? Math.round((acc[i].completed / acc[i].total) * 100) : 0,
  }));

  const completedW = inWindow.filter((o) => o.status === 'completed');
  const live = orders.filter((o) => o.status === 'in_progress' || o.status === 'ready').length;
  const kpis = {
    revenue: completedW.reduce((s, o) => s + (Number(o.price) || 0), 0),
    orders: inWindow.length,
    live,
    technicians: new Set(inWindow.filter((o) => o.assigned_to).map((o) => o.assigned_to)).size,
    techLoad: inWindow.length ? Math.round((live / Math.max(inWindow.length, 1)) * 100) : 0,
    efficiency: inWindow.length ? Math.round((completedW.length / inWindow.length) * 100) : 0,
    workers: workers.length,
  };

  const statusDist = STATUS_META
    .map((s) => ({ name: s.name, value: inWindow.filter((o) => o.status === s.key).length, color: s.color }))
    .filter((s) => s.value > 0);

  const svc = {};
  inWindow.forEach((o) => {
    const k = o.service_type || 'أخرى';
    if (!svc[k]) svc[k] = { name: k, count: 0, revenue: 0 };
    svc[k].count++;
    if (o.status === 'completed') svc[k].revenue += Number(o.price) || 0;
  });
  const topServices = Object.values(svc).sort((a, b) => b.count - a.count).slice(0, 5);

  return { series, kpis, statusDist, topServices, windowCount: inWindow.length };
}
