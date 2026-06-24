/* ============================================================================
 * VOLD MOTOR — Super-Admin Dashboard Mock Data Generator (Seeder)
 * ----------------------------------------------------------------------------
 * Framework-agnostic ESM module. Generates realistic Centers, Services and
 * Completed Orders, plus aggregation helpers ready to feed any chart library
 * (Recharts / Chart.js / ApexCharts).
 *
 * Usage:
 *   import { buildDataset, aggregations } from './mock/vm-seed.js';
 *   const data = buildDataset();              // { centers, services, orders, meta }
 *   const byType = aggregations.salesByCenterType(data);
 *   const daily  = aggregations.dailyPlatformProfit(data);
 *   const hourly = aggregations.ordersByHour(data);   // 24-hour series, 00→23
 * ========================================================================== */

/* ── Config ───────────────────────────────────────────────────────────────── */
export const CONFIG = {
  centers: 15,            // ≥ 15 centers
  orders: 420,            // 300–500 completed orders
  days: 30,               // spread over the last N days
  commissionRate: 0.15,   // platform commission = 15% of sale
  seed: 42,               // deterministic output (change for a new dataset)
};

export const CENTER_TYPES = ['Car Wash', 'Oil Shop', 'Mechanic Workshop'];

/* ── Deterministic PRNG (mulberry32) — repeatable runs ───────────────────── */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick   = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const intIn  = (rnd, min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const pad2   = (n) => String(n).padStart(2, '0');

/* ── Name pools & service catalog (per center type) ──────────────────────── */
const NAME_POOLS = {
  'Car Wash':          ['Sparkle Auto Wash', 'Crystal Shine', 'AquaJet Detailing', 'Mirror Finish', 'Pure Gloss', 'Foam Kings'],
  'Oil Shop':          ['QuickLube Pro', 'OilMaster', 'SpeedLube', 'GoldenDrop Oils', 'PitStop Lube', 'EngineCare'],
  'Mechanic Workshop': ['ProTech Motors', 'GearHead Garage', 'Apex Auto Repair', 'TorqueLine', 'Precision Mechanics', 'DriveFix Center'],
};

const SERVICE_CATALOG = {
  'Car Wash': [
    { name: 'Express Wash',   price: [25, 40] },
    { name: 'Premium Wash',   price: [60, 95] },
    { name: 'Full Detailing', price: [160, 320] },
    { name: 'Interior Deep Clean', price: [90, 150] },
  ],
  'Oil Shop': [
    { name: 'Synthetic Oil Change', price: [120, 230] },
    { name: 'Oil & Filter Change',  price: [90, 160] },
    { name: 'Fluids Top-up',        price: [40, 80] },
    { name: 'Engine Flush',         price: [70, 130] },
  ],
  'Mechanic Workshop': [
    { name: 'Brake Pad Replacement', price: [180, 360] },
    { name: 'Battery Replacement',   price: [200, 460] },
    { name: 'AC Service',            price: [150, 300] },
    { name: 'Engine Diagnostics',    price: [80, 150] },
    { name: 'Suspension Repair',     price: [300, 700] },
  ],
};

/* ── Generators ──────────────────────────────────────────────────────────── */
export function generateCenters(rnd, count = CONFIG.centers) {
  const used = {};
  const centers = [];
  for (let i = 0; i < count; i++) {
    const type = CENTER_TYPES[i % CENTER_TYPES.length];        // even spread across types
    const pool = NAME_POOLS[type];
    used[type] = used[type] || 0;
    const name = `${pool[used[type] % pool.length]}${used[type] >= pool.length ? ' ' + (Math.floor(used[type] / pool.length) + 1) : ''}`;
    used[type]++;
    const joinOffset = intIn(rnd, 10, 240);                    // joined 10–240 days ago
    const joinDate = new Date(Date.now() - joinOffset * 86400000);
    centers.push({
      id: `c-${pad2(i + 1)}`,
      name,
      type,
      joinDate: joinDate.toISOString(),
      status: rnd() < 0.88 ? 'active' : 'suspended',            // ~88% active
    });
  }
  return centers;
}

export function generateServices(rnd, centers) {
  const services = [];
  let n = 1;
  for (const c of centers) {
    for (const tpl of SERVICE_CATALOG[c.type]) {
      services.push({
        id: `s-${pad2(n++)}`,
        centerId: c.id,
        name: tpl.name,
        price: intIn(rnd, tpl.price[0], tpl.price[1]),
      });
    }
  }
  return services;
}

export function generateOrders(rnd, centers, services, opts = {}) {
  const total = opts.orders || CONFIG.orders;
  const days = opts.days || CONFIG.days;
  const rate = opts.commissionRate ?? CONFIG.commissionRate;
  const activeCenters = centers.filter((c) => c.status === 'active');
  const svcByCenter = {};
  for (const s of services) (svcByCenter[s.centerId] ||= []).push(s);
  const now = new Date();
  const orders = [];
  let n = 1;

  const makeOrder = (dayOffset, hour) => {
    const center = pick(rnd, activeCenters);
    const svc = pick(rnd, svcByCenter[center.id]);
    const ts = new Date(now);
    ts.setDate(now.getDate() - dayOffset);
    ts.setHours(hour, intIn(rnd, 0, 59), intIn(rnd, 0, 59), 0);
    // small per-order price variance around the catalog price
    const totalSales = Math.round(svc.price * (0.9 + rnd() * 0.25));
    const platformCommission = Math.round(totalSales * rate * 100) / 100;
    orders.push({
      id: `o-${String(n++).padStart(4, '0')}`,
      centerId: center.id,
      serviceId: svc.id,
      timestamp: ts.toISOString(),
      totalSales,
      platformCommission,
    });
  };

  // 1) GUARANTEE coverage: at least one order in every hour 00..23 (today)
  for (let h = 0; h <= 23; h++) makeOrder(0, h);

  // 2) Fill the rest, spread across days (weighted to recent) and all hours
  while (orders.length < total) {
    const dayOffset = Math.floor(Math.pow(rnd(), 1.5) * days);  // bias toward recent days
    // daytime-weighted hour, but every hour still possible
    const hour = rnd() < 0.7 ? intIn(rnd, 8, 22) : intIn(rnd, 0, 23);
    makeOrder(dayOffset, hour);
  }

  // chronological order (oldest → newest)
  orders.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return orders;
}

/* ── One-call dataset builder ────────────────────────────────────────────── */
export function buildDataset(cfg = {}) {
  const conf = { ...CONFIG, ...cfg };
  const rnd = makeRng(conf.seed);
  const centers = generateCenters(rnd, conf.centers);
  const services = generateServices(rnd, centers);
  const orders = generateOrders(rnd, centers, services, conf);
  return {
    centers,
    services,
    orders,
    meta: {
      commissionRate: conf.commissionRate,
      days: conf.days,
      counts: { centers: centers.length, services: services.length, orders: orders.length },
      generatedAt: new Date().toISOString(),
    },
  };
}

/* ── Aggregation helpers (chart-ready) ───────────────────────────────────── */
export const aggregations = {
  /** Total sales & commission grouped by CENTER TYPE. */
  salesByCenterType({ centers, orders }) {
    const typeOf = Object.fromEntries(centers.map((c) => [c.id, c.type]));
    const out = Object.fromEntries(CENTER_TYPES.map((t) => [t, { type: t, orders: 0, totalSales: 0, platformCommission: 0 }]));
    for (const o of orders) {
      const t = typeOf[o.centerId];
      if (!out[t]) continue;
      out[t].orders++;
      out[t].totalSales += o.totalSales;
      out[t].platformCommission += o.platformCommission;
    }
    return Object.values(out).map((r) => ({
      ...r,
      totalSales: Math.round(r.totalSales),
      platformCommission: Math.round(r.platformCommission),
    }));
  },

  /** Daily platform profit over the last N days — sorted chronologically. */
  dailyPlatformProfit({ orders }, days = CONFIG.days) {
    const now = new Date();
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      buckets.push({ date: d.toISOString().slice(0, 10), orders: 0, totalSales: 0, platformCommission: 0, _start: d.getTime(), _end: d.getTime() + 86400000 });
    }
    for (const o of orders) {
      const t = new Date(o.timestamp).getTime();
      const b = buckets.find((x) => t >= x._start && t < x._end);
      if (b) { b.orders++; b.totalSales += o.totalSales; b.platformCommission += o.platformCommission; }
    }
    return buckets.map(({ _start, _end, ...r }) => ({ ...r, totalSales: Math.round(r.totalSales), platformCommission: Math.round(r.platformCommission) }));
  },

  /** 24-hour time series (00→23) — for the hourly chart & sort testing. */
  ordersByHour({ orders }) {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: pad2(h), orders: 0, totalSales: 0, platformCommission: 0 }));
    for (const o of orders) {
      const h = new Date(o.timestamp).getHours();
      arr[h].orders++; arr[h].totalSales += o.totalSales; arr[h].platformCommission += o.platformCommission;
    }
    return arr.map((r) => ({ ...r, totalSales: Math.round(r.totalSales), platformCommission: Math.round(r.platformCommission) }));
  },

  /** Headline totals. */
  totals({ orders, centers }) {
    const totalSales = orders.reduce((a, o) => a + o.totalSales, 0);
    const platformCommission = orders.reduce((a, o) => a + o.platformCommission, 0);
    return {
      orders: orders.length,
      activeCenters: centers.filter((c) => c.status === 'active').length,
      totalSales: Math.round(totalSales),
      platformCommission: Math.round(platformCommission),
    };
  },
};

/* ── Default export: a ready dataset ─────────────────────────────────────── */
const dataset = buildDataset();
export default dataset;

/* CommonJS / <script> fallback */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, CENTER_TYPES, generateCenters, generateServices, generateOrders, buildDataset, aggregations, default: dataset };
}
