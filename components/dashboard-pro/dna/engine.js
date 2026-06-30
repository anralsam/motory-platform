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

// Compact axis formatter: 45000 → 45k · 1200000 → 1.2M.
export const fmtCompact = (v) => {
  const s = Number(v) || 0;
  const n = Math.abs(s);
  if (n >= 1e6) return `${(s / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(s / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `${s}`;
};

// ── UnifiedChart multi-filter matrix ──
export const CHART_METRICS = [
  { key: 'revenue', label: 'الأرباح', unit: 'sar' },
  { key: 'sales', label: 'المبيعات', unit: 'int' },
  { key: 'customers', label: 'عدد العملاء', unit: 'int' },
];
export const CHART_TIMELINES = [
  { key: 'day', label: 'آخر يوم' },
  { key: 'week', label: 'آخر أسبوع' },
  { key: 'month', label: 'آخر شهر' },
  { key: 'year', label: 'آخر سنة' },
];

/**
 * Build the chart series for a (metric × timeline) cell of the matrix.
 *   metric:   revenue (completed SAR) · sales (order count) · customers (unique names)
 *   timeline: day (24 hourly) · week (7 daily) · month (30 daily) · year (12 monthly)
 * Returns { series: [{label, value}], unit }. Pure — recomputes instantly client-side.
 */
export function computeChartSeries(orders = [], metric = 'revenue', timeline = 'week') {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = [];
  if (timeline === 'day') {
    for (let h = 0; h < 24; h++) buckets.push({ label: `${String(h).padStart(2, '0')}:00` });
  } else if (timeline === 'week' || timeline === 'month') {
    const span = timeline === 'week' ? 7 : 30;
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, key: d.toISOString().slice(0, 10) });
    }
  } else {
    for (let m = 0; m < 12; m++) buckets.push({ label: MONTHS[m] });
  }

  const keyIndex = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
  const acc = buckets.map(() => (metric === 'customers' ? new Set() : 0));
  orders.forEach((o) => {
    if (!o.created_at) return;
    const dt = new Date(o.created_at);
    let idx = -1;
    if (timeline === 'day') {
      if (dt >= today) idx = dt.getHours();
    } else if (timeline === 'year') {
      if (dt.getFullYear() === now.getFullYear()) idx = dt.getMonth();
    } else {
      idx = keyIndex[dt.toISOString().slice(0, 10)] ?? -1;
    }
    if (idx < 0 || idx >= acc.length) return;
    if (metric === 'revenue') { if (o.status === 'completed') acc[idx] += Number(o.price) || 0; }
    else if (metric === 'sales') { acc[idx] += 1; }
    else if (o.customer_name) acc[idx].add(o.customer_name);
  });

  const series = buckets.map((b, i) => ({ label: b.label, value: metric === 'customers' ? acc[i].size : acc[i] }));
  const unit = metric === 'revenue' ? 'sar' : 'int';
  return { series, unit };
}

/**
 * Compute the KPI / status / top-services datasets for the active TIMELINE window.
 * The UnifiedChart matrix is the master controller — it sets the timeline, and this
 * re-windows every Hero card and table to match. Runs client-side (instant).
 *   day → today · week → last 7d · month → last 30d · year → current year.
 */
export function timelineWindowStart(timeline, now = new Date()) {
  if (timeline === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (timeline === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (timeline === 'month') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  return new Date(now.getFullYear(), 0, 1); // year
}

export function computeDerived(orders = [], workers = [], timeline = 'week') {
  const windowStart = timelineWindowStart(timeline);
  const inWindow = orders.filter((o) => o.created_at && new Date(o.created_at) >= windowStart);
  const completedW = inWindow.filter((o) => o.status === 'completed');
  const live = orders.filter((o) => o.status === 'in_progress' || o.status === 'ready').length;

  const kpis = {
    revenue: completedW.reduce((s, o) => s + (Number(o.price) || 0), 0),
    orders: inWindow.length,
    live,
    technicians: new Set(inWindow.filter((o) => o.assigned_to).map((o) => o.assigned_to)).size,
    techLoad: inWindow.length ? Math.min(100, Math.round((live / Math.max(inWindow.length, 1)) * 100)) : 0,
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

  return { kpis, statusDist, topServices, windowCount: inWindow.length };
}
