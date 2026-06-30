'use client';

/**
 * MerchantDashboard — shop-owner command center. YouTube-Studio light theme.
 * Design tokens (strict):
 *   • Card: #fff · rounded-2xl · border-slate-200 · shadow-[0_2px_10px_-3px_rgba(0,0,0,.07)].
 *   • Hover: scale-[1.01] + soft deepened shadow, 300ms ease-out.
 * Sections: Hero metrics (with MoM growth pills) → Command Grid (revenue area
 * chart 2/3 + status donut 1/3) → Top-5 services demand bars → Live Operations.
 * All data real (server-computed). Optimistic on task start.
 */
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Wallet, Activity, Users, HeartPulse } from 'lucide-react';
import StatTile from './StatTile';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import NoData from './NoData';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] transition-all duration-300 ease-out';
const CARD_HOVER = `${CARD} hover:scale-[1.01] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12)]`;

export default function MerchantDashboard({ metrics = {}, orders = [], inventory = [], workers = [], trend = [], statusDist = [], topServices = [], totalOrders = 0, revGrowth, ordGrowth }) {
  const [items, setItems] = useState(orders);
  const [modalOrder, setModalOrder] = useState(null);
  const [trendKey, setTrendKey] = useState('revenue');
  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));

  function onStarted(id) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'in_progress' } : o)));
  }

  const maxSvc = topServices[0]?.count || 1;

  return (
    <div className="space-y-5">
      {/* ── Hero metrics ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} tone="blue" label="الإيراد اليومي" value={sar(metrics.revenue)} sub="من الطلبات المكتملة" growth={revGrowth} />
        <StatTile icon={Activity} tone="blue" label="الطلبات النشطة" value={(metrics.active || 0).toLocaleString('en-US')} sub="جارية الآن" growth={ordGrowth} />
        <StatTile icon={Users} tone="blue" label="حمل الفنّيين" value={`${metrics.techLoad || 0}%`} sub="نسبة الانشغال" />
        <StatTile icon={HeartPulse} tone="blue" label="صحة المركز" value={`${metrics.health || 0}%`} sub="معدّل الإنجاز" />
      </div>

      {/* ── Command Grid: revenue area (2/3) + status donut (1/3) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue / operations trend */}
        <div className={`${CARD_HOVER} p-6 lg:col-span-2`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900">تحليل الأداء</div>
              <div className="mt-0.5 text-xs font-normal text-slate-400">{trendKey === 'revenue' ? 'الإيراد الشهري' : 'عدد العمليات الشهري'} عبر العام</div>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[['revenue', 'الإيراد'], ['orders', 'العمليات']].map(([k, l]) => (
                <button key={k} onClick={() => setTrendKey(k)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${trendKey === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="h-72" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="mTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={42} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }} formatter={(v) => [trendKey === 'revenue' ? `${Number(v).toLocaleString('en-US')} ﷼` : v, trendKey === 'revenue' ? 'الإيراد' : 'العمليات']} />
                <Area type="monotone" dataKey={trendKey} stroke="#2563eb" strokeWidth={3} fill="url(#mTrend)" dot={false} activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status distribution donut */}
        <div className={`${CARD_HOVER} p-6 lg:col-span-1`}>
          <div className="text-base font-bold tracking-tight text-slate-900">توزيع الحالات</div>
          <div className="mt-0.5 mb-4 text-xs font-normal text-slate-400">إجمالي {totalOrders.toLocaleString('en-US')} طلب</div>
          {statusDist.length ? (
            <>
              <div className="relative mx-auto h-44 w-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74} paddingAngle={2} strokeWidth={0}>
                      {statusDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-inter text-3xl font-bold tabular-nums text-slate-900" dir="ltr">{totalOrders}</span>
                  <span className="text-[10px] text-slate-400">طلب</span>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* ── Top 5 services demand bars ── */}
      <div className={`${CARD_HOVER} p-6`}>
        <div className="text-base font-bold tracking-tight text-slate-900">أفضل الخدمات</div>
        <div className="mt-0.5 mb-5 text-xs font-normal text-slate-400">الأكثر طلباً مع إيرادها</div>
        {topServices.length ? (
          <div className="space-y-4">
            {topServices.map((s, i) => (
              <div key={s.name + i}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-slate-100 font-inter text-[10px] font-bold text-slate-500" dir="ltr">{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-slate-400">{s.count} طلب</span>
                    <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{sar(s.revenue)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600 transition-all duration-700 ease-out" style={{ width: `${Math.max(6, Math.round((s.count / maxSvc) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">لا توجد خدمات مسجّلة بعد</div>
        )}
      </div>

      {/* ── Live Operations ── */}
      <div>
        <div className="mb-3 text-base font-bold tracking-tight text-slate-900">العمليات الحيّة</div>
        {items.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((o) => (
              <div key={o.id} className={`${CARD_HOVER} flex flex-col p-5`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{o.plate || '—'}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
                <div className="mt-1 text-xs font-normal text-slate-400">{o.customer_name || 'عميل'} · {nameByUser[o.assigned_to] || 'غير مكلّف'}</div>
                {o.status !== 'completed' && (
                  <button onClick={() => setModalOrder(o)}
                    className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-blue-700">
                    {o.status === 'in_progress' ? 'متابعة المهمة' : 'بدء المهمة'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <NoData title="لا توجد عمليات حيّة" hint="كل الطلبات مكتملة أو لا توجد طلبات نشطة." />
        )}
      </div>

      <AnimatePresence>
        {modalOrder && (
          <StartTaskModal key="m" order={modalOrder} inventory={inventory} onClose={() => setModalOrder(null)} onStarted={onStarted} />
        )}
      </AnimatePresence>
    </div>
  );
}
