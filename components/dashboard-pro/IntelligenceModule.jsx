'use client';

/**
 * IntelligenceModule — Admin predictive analytics.
 *   • Top-level filters (Time-range, Branch, Mechanic) refresh the view INSTANTLY
 *     (in-memory; the raw dataset is fetched server-side + cached upstream).
 *   • Growth trend (clean line), Peak hours (clean line), Technician rankings.
 *   • Sleek lines, no gradients, soft VOLD MOTOR cards on a clean background.
 */
import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Clock, Trophy } from 'lucide-react';
import StatTile from './StatTile';

const RANGES = [['7d', '٧ أيام'], ['30d', '٣٠ يوم'], ['90d', '٩٠ يوم'], ['all', 'الكل']];
const DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function Card({ title, sub, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-900">{title}</div>
      {sub ? <div className="mb-4 text-xs font-normal text-slate-400">{sub}</div> : <div className="mb-4" />}
      {children}
    </div>
  );
}

const lineProps = { type: 'monotone', stroke: '#4f46e5', strokeWidth: 2, dot: false, activeDot: { r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 } };
const axisTick = { fontSize: 11, fill: '#a1a1aa' };
const tipStyle = { borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12, boxShadow: 'none' };

export default function IntelligenceModule({ orders = [], workers = [], branches = [] }) {
  const [range, setRange] = useState('30d');
  const [branchId, setBranchId] = useState('all');
  const [mechanic, setMechanic] = useState('all');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const workerName = useMemo(() => Object.fromEntries(workers.map((w) => [w.user_id, w.full_name])), [workers]);

  const filtered = useMemo(() => {
    const cutoff = mounted && range !== 'all' ? Date.now() - DAYS[range] * 86400000 : null;
    return orders.filter((o) =>
      (branchId === 'all' || o.branch_id === branchId) &&
      (mechanic === 'all' || o.assigned_to === mechanic) &&
      (!cutoff || new Date(o.created_at).getTime() >= cutoff),
    );
  }, [orders, range, branchId, mechanic, mounted]);

  const growth = useMemo(() => {
    const m = new Map();
    filtered.forEach((o) => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      m.set(key, (m.get(key) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => ({ label: k.slice(5), value: v }));
  }, [filtered]);

  const peak = useMemo(() => {
    const h = Array(24).fill(0);
    filtered.forEach((o) => { h[new Date(o.created_at).getHours()]++; });
    return h.map((v, i) => ({ label: String(i), value: v })).slice(6, 24);
  }, [filtered]);

  const rankings = useMemo(() => {
    const byTech = new Map();
    filtered.forEach((o) => {
      if (!o.assigned_to) return;
      const t = byTech.get(o.assigned_to) || { total: 0, completed: 0, durSum: 0, durN: 0 };
      t.total++;
      if (o.status === 'completed') {
        t.completed++;
        if (o.started_at && o.completed_at) {
          const mins = (new Date(o.completed_at) - new Date(o.started_at)) / 60000;
          if (mins > 0) { t.durSum += mins; t.durN++; }
        }
      }
      byTech.set(o.assigned_to, t);
    });
    return [...byTech.entries()]
      .map(([uid, t]) => ({ name: workerName[uid] || 'فنّي', completed: t.completed, total: t.total, avgMin: t.durN ? Math.round(t.durSum / t.durN) : null }))
      .sort((a, b) => b.completed - a.completed);
  }, [filtered, workerName]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const half = Math.floor(growth.length / 2);
    const a = growth.slice(0, half).reduce((s, x) => s + x.value, 0);
    const b = growth.slice(half).reduce((s, x) => s + x.value, 0);
    const trendPct = a ? Math.round(((b - a) / a) * 100) : b > 0 ? 100 : 0;
    let busiest = 0, max = -1;
    peak.forEach((p) => { if (p.value > max) { max = p.value; busiest = Number(p.label); } });
    const avgPerDay = growth.length ? total / growth.length : 0;
    const projected = Math.round(avgPerDay * 7);
    return { total, trendPct, busiest, topTech: rankings[0]?.name || '—', projected };
  }, [filtered, growth, peak, rankings]);

  const selectCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-600';

  return (
    <div className="space-y-5">
      {/* Top-level filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {RANGES.map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${range === k ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={selectCls}>
          <option value="all">كل الفروع</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name || 'فرع'}</option>)}
        </select>
        <select value={mechanic} onChange={(e) => setMechanic(e.target.value)} className={selectCls}>
          <option value="all">كل الفنّيين</option>
          {workers.map((w) => <option key={w.user_id} value={w.user_id}>{w.full_name || 'فنّي'}</option>)}
        </select>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <StatTile icon={Activity} tone="indigo" label="إجمالي الطلبات" value={kpis.total.toLocaleString('en-US')} sub={`متوقّع الأسبوع القادم ~${kpis.projected}`} />
        <StatTile icon={kpis.trendPct >= 0 ? TrendingUp : TrendingDown} tone={kpis.trendPct >= 0 ? 'emerald' : 'rose'} label="اتجاه النمو" value={`${kpis.trendPct >= 0 ? '+' : ''}${kpis.trendPct}%`} sub="مقارنة بالنصف السابق" />
        <StatTile icon={Clock} tone="amber" label="ساعة الذروة" value={`${kpis.busiest}:00`} sub="أكثر الساعات ازدحاماً" />
        <StatTile icon={Trophy} tone="slate" label="أفضل فنّي" value={kpis.topTech} sub="الأكثر إنجازاً" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="اتجاه النمو" sub="عدد الطلبات الجديدة عبر الزمن">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={28} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v, 'طلب']} />
                <Line {...lineProps} dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="ساعات الذروة" sub="توزيع الطلبات على مدار اليوم">
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peak} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={1} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={28} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [v, 'طلب']} labelFormatter={(l) => `الساعة ${l}:00`} />
                <Line {...lineProps} stroke="#10b981" dataKey="value" activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Technician rankings */}
      <Card title="ترتيب أداء الفنّيين" sub="حسب المهام المكتملة ومتوسط زمن الإنجاز">
        {rankings.length ? (
          <div className="space-y-3">
            {rankings.map((r, i) => {
              const max = rankings[0].completed || 1;
              return (
                <div key={r.name + i} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 tabular-nums">{i + 1}</span>
                  <span className="w-24 flex-none truncate text-sm font-medium text-slate-700">{r.name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.round((r.completed / max) * 100)}%` }} />
                  </div>
                  <span className="w-10 flex-none text-end text-sm font-semibold tabular-nums text-slate-900">{r.completed}</span>
                  <span className="w-16 flex-none text-end text-xs font-normal text-slate-400 tabular-nums">{r.avgMin != null ? `${r.avgMin}د` : '—'}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-400">لا توجد مهام مكلّفة لفنّيين ضمن هذا النطاق</p>
        )}
      </Card>
    </div>
  );
}
