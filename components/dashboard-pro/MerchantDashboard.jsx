'use client';

/**
 * MerchantDashboard — high-end financial-app command center (RTL).
 * Constraints (strict):
 *   • Metrics: grid-cols-4 · elevated white cards · inner border-slate-100 ·
 *     bottom 2px accent bar (#2563eb) · large bold values · font-medium labels.
 *   • Analytics/Operations: grid-cols-3 · recharts area with blue→transparent
 *     gradient (Stripe/Shopify depth).
 *   • Negative space: generous p-8 everywhere. Micro-hover scale-[1.01].
 * All data real (server-computed). Optimistic on task start.
 */
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Wallet, Activity, Users, HeartPulse, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import NoData from './NoData';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;
const PANEL = 'rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12)]';

function GrowthPill({ growth }) {
  const up = growth >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="group/g relative">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`} dir="ltr">
        <Arrow size={13} strokeWidth={2.5} />{`${up ? '+' : ''}${growth.toFixed(1)}%`}
      </span>
      <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover/g:opacity-100">
        مقابل الشهر الماضي
      </span>
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, sub, growth }) {
  const hasGrowth = typeof growth === 'number' && isFinite(growth);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)] transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12)]">
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-105">
          <Icon size={22} strokeWidth={2} />
        </span>
        {hasGrowth ? <GrowthPill growth={growth} /> : null}
      </div>
      <div className="mt-7 font-inter text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-slate-900" dir="ltr">{value}</div>
      <div className="mt-3 text-sm font-medium text-slate-600">{label}</div>
      {sub ? <div className="mt-1 text-xs font-normal text-slate-400">{sub}</div> : null}
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#2563eb]" />
    </div>
  );
}

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
    <div className="space-y-6">
      {/* ── Metrics: grid-cols-4 elevated cards with accent bar ── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="الإيراد اليومي" value={sar(metrics.revenue)} sub="من الطلبات المكتملة" growth={revGrowth} />
        <MetricCard icon={Activity} label="الطلبات النشطة" value={(metrics.active || 0).toLocaleString('en-US')} sub="جارية الآن" growth={ordGrowth} />
        <MetricCard icon={Users} label="حمل الفنّيين" value={`${metrics.techLoad || 0}%`} sub="نسبة الانشغال" />
        <MetricCard icon={HeartPulse} label="صحة المركز" value={`${metrics.health || 0}%`} sub="معدّل الإنجاز" />
      </div>

      {/* ── Analytics module: grid-cols-3 (chart 2/3 + status donut 1/3) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${PANEL} p-8 lg:col-span-2`}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">تحليل الأداء</div>
              <div className="mt-1 text-sm font-medium text-slate-400">{trendKey === 'revenue' ? 'الإيراد الشهري' : 'عدد العمليات الشهري'} عبر العام</div>
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[['revenue', 'الإيراد'], ['orders', 'العمليات']].map(([k, l]) => (
                <button key={k} onClick={() => setTrendKey(k)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${trendKey === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="mTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                    <stop offset="75%" stopColor="#3b82f6" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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

        <div className={`${PANEL} p-8 lg:col-span-1`}>
          <div className="text-lg font-bold tracking-tight text-slate-900">توزيع الحالات</div>
          <div className="mt-1 mb-6 text-sm font-medium text-slate-400">إجمالي {totalOrders.toLocaleString('en-US')} طلب</div>
          {statusDist.length ? (
            <>
              <div className="relative mx-auto h-44 w-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={54} outerRadius={76} paddingAngle={2} strokeWidth={0}>
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
              <div className="mt-6 space-y-3">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* ── Operations: grid-cols-3 (top-5 services 2/3 + live ops 1/3) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${PANEL} p-8 lg:col-span-2`}>
          <div className="text-lg font-bold tracking-tight text-slate-900">أفضل الخدمات</div>
          <div className="mt-1 mb-6 text-sm font-medium text-slate-400">الأكثر طلباً مع إيرادها</div>
          {topServices.length ? (
            <div className="space-y-5">
              {topServices.map((s, i) => (
                <div key={s.name + i}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 font-semibold text-slate-700">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 font-inter text-[11px] font-bold text-slate-500" dir="ltr">{i + 1}</span>
                      {s.name}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-xs font-medium text-slate-400">{s.count} طلب</span>
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
            <div className="py-14 text-center text-sm text-slate-400">لا توجد خدمات مسجّلة بعد</div>
          )}
        </div>

        <div className={`${PANEL} flex flex-col p-8 lg:col-span-1`}>
          <div className="text-lg font-bold tracking-tight text-slate-900">العمليات الحيّة</div>
          <div className="mt-1 mb-5 text-sm font-medium text-slate-400">{items.length} طلب نشط</div>
          {items.length ? (
            <div className="-mr-2 max-h-96 space-y-3 overflow-y-auto pe-2">
              {items.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 transition-all duration-300 ease-out hover:scale-[1.01] hover:bg-white hover:shadow-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{o.plate || '—'}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
                  <div className="mt-0.5 text-xs font-normal text-slate-400">{o.customer_name || 'عميل'} · {nameByUser[o.assigned_to] || 'غير مكلّف'}</div>
                  {o.status !== 'completed' && (
                    <button onClick={() => setModalOrder(o)}
                      className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-blue-700">
                      {o.status === 'in_progress' ? 'متابعة المهمة' : 'بدء المهمة'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-slate-400">لا توجد عمليات حيّة</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOrder && (
          <StartTaskModal key="m" order={modalOrder} inventory={inventory} onClose={() => setModalOrder(null)} onStarted={onStarted} />
        )}
      </AnimatePresence>
    </div>
  );
}
