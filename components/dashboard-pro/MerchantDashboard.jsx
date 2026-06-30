'use client';

/**
 * MerchantDashboard — shop-owner command center. Same visual language as
 * AdminDashboard (System Token):
 *   • 4 hero cards: Daily Revenue, Active Orders, Technician Load, Shop Health.
 *   • 'Live Operations' grid — each order card (plate · service · technician ·
 *     status) with a 'Start Task' button that opens the Worker Modal.
 * Floating, high-end, low-clutter. Optimistic on task start.
 */
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Wallet, Activity, Users, HeartPulse, Clock } from 'lucide-react';
import StatTile from './StatTile';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import NoData from './NoData';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

export default function MerchantDashboard({ metrics = {}, orders = [], inventory = [], workers = [], peak = [], lastHour = {}, trend = [], statusDist = [], topServices = [], totalOrders = 0, revGrowth, ordGrowth }) {
  const [items, setItems] = useState(orders);
  const [modalOrder, setModalOrder] = useState(null);
  const [trendKey, setTrendKey] = useState('revenue');
  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));

  function onStarted(id) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'in_progress' } : o)));
  }

  return (
    <div className="space-y-6">
      {/* 4 hero cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} tone="blue" label="الإيراد اليومي" value={sar(metrics.revenue)} sub="من الطلبات المكتملة" growth={revGrowth} />
        <StatTile icon={Activity} tone="blue" label="الطلبات النشطة" value={(metrics.active || 0).toLocaleString('en-US')} sub="جارية الآن" growth={ordGrowth} />
        <StatTile icon={Users} tone="blue" label="حمل الفنّيين" value={`${metrics.techLoad || 0}%`} sub="نسبة الانشغال" />
        <StatTile icon={HeartPulse} tone="blue" label="صحة المركز" value={`${metrics.health || 0}%`} sub="معدّل الإنجاز" />
      </div>

      {/* Performance trend — smooth area chart (revenue ↔ operations) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">تحليل الأداء</div>
            <div className="text-xs font-normal text-slate-400">{trendKey === 'revenue' ? 'الإيراد الشهري' : 'عدد العمليات الشهري'} عبر العام</div>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {[['revenue', 'الإيراد'], ['orders', 'العمليات']].map(([k, l]) => (
              <button key={k} onClick={() => setTrendKey(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${trendKey === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="mTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={42} tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: 'none' }} formatter={(v) => [trendKey === 'revenue' ? `${Number(v).toLocaleString('en-US')} ﷼` : v, trendKey === 'revenue' ? 'الإيراد' : 'العمليات']} />
              <Area type="monotone" dataKey={trendKey} stroke="#2563eb" strokeWidth={3} fill="url(#mTrend)" dot={false} activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status distribution (donut) + top services */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-1 text-sm font-semibold text-slate-900">توزيع الحالات</div>
          <div className="mb-4 text-xs font-normal text-slate-400">إجمالي {totalOrders.toLocaleString('en-US')} طلب</div>
          {statusDist.length ? (
            <div className="flex items-center gap-4">
              <div className="relative h-40 w-40 shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} strokeWidth={0}>
                      {statusDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: 'none' }} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-inter text-2xl font-bold tabular-nums text-slate-900" dir="ltr">{totalOrders}</span>
                  <span className="text-[10px] text-slate-400">طلب</span>
                </div>
              </div>
              <div className="flex-1 space-y-2.5">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">لا توجد بيانات</div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-1 text-sm font-semibold text-slate-900">أفضل الخدمات</div>
          <div className="mb-4 text-xs font-normal text-slate-400">الأكثر طلباً مع إيرادها</div>
          {topServices.length ? (
            <div className="space-y-3">
              {topServices.map((s, i) => {
                const max = topServices[0].count || 1;
                return (
                  <div key={s.name + i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-slate-400">{s.count} طلب</span>
                        <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{sar(s.revenue)}</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${Math.max(6, Math.round((s.count / max) * 100))}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">لا توجد خدمات مسجّلة بعد</div>
          )}
        </div>
      </div>

      {/* Last-hour performance + peak times */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock size={16} className="text-blue-600" /> أداء آخر ساعة</div>
          <div className="mb-5 text-xs font-normal text-slate-400">السيارات داخل الصالة الآن</div>
          <div className="font-inter text-4xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{lastHour.inHall ?? 0}</div>
          <div className="mt-2 text-xs text-slate-500">مقابل متوسط يومي <span className="font-semibold tabular-nums text-slate-700" dir="ltr">{lastHour.dailyAvg ?? 0}</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-1 text-sm font-semibold text-slate-900">أوقات الذروة</div>
          <div className="mb-4 text-xs font-normal text-slate-400">إقبال السيارات حسب أيام الأسبوع</div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peak} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={26} />
                <Tooltip cursor={{ fill: 'rgba(37,99,235,.06)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: 'none' }} formatter={(v) => [v, 'سيارة']} />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Operations grid */}
      <div>
        <div className="mb-3 text-sm font-semibold text-slate-900">العمليات الحيّة</div>
        {items.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((o) => (
              <div key={o.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{o.plate || '—'}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
                <div className="mt-1 text-xs font-normal text-slate-400">{o.customer_name || 'عميل'} · {nameByUser[o.assigned_to] || 'غير مكلّف'}</div>
                {o.status !== 'completed' && (
                  <button onClick={() => setModalOrder(o)}
                    className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:scale-[1.02] hover:bg-blue-700">
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
