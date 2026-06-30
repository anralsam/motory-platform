'use client';

/**
 * MerchantDashboard — canonical consumer of the Grand Unified DNA.
 * Owns no data logic: it mounts <DashboardContainer> (the brain) and renders the
 * metric grid + the shared <UnifiedChart> + status donut + top services + live ops,
 * all reading the global filter context. Every mutation goes through the centralized
 * optimistic actions. Pure tokens (border-line / text-secondary / bg-accent), p-8, RTL.
 */
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Wallet, Activity, Users, HeartPulse } from 'lucide-react';
import DashboardContainer, { useDashboardData, useActions } from './dna/DashboardContainer';
import UnifiedChart from './dna/UnifiedChart';
import { fmtValue } from './dna/engine';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import AssignControl from './AssignControl';
import NoData from './NoData';
import { updateOrderStatus, assignOrderToWorker, startOrderWithParts, deductParts } from '@/app/dashboard-pro/actions';

export default function MerchantDashboard({ orders = [], workers = [], inventory = [] }) {
  return (
    <DashboardContainer role="merchant" orders={orders} workers={workers} inventory={inventory}
      actions={{ updateOrderStatus, assignOrderToWorker, startOrderWithParts, deductParts }}>
      <MerchantBody />
    </DashboardContainer>
  );
}

function MetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-white p-8 shadow-sm transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-accent transition-transform duration-300 group-hover:scale-105"><Icon size={22} strokeWidth={2} /></span>
      </div>
      <div className="mt-7 font-inter text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-slate-900" dir="ltr">{value}</div>
      <div className="mt-3 text-sm font-medium text-secondary">{label}</div>
      {sub ? <div className="mt-1 text-xs font-normal text-slate-400">{sub}</div> : null}
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
    </div>
  );
}

function MerchantBody() {
  const { kpis, statusDist, topServices, windowCount } = useDashboardData();
  const { orders, inventory, workers, patchOrder } = useActions();
  const [modalOrder, setModalOrder] = useState(null);

  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));
  const live = orders.filter((o) => o.status !== 'completed').slice(0, 12);
  const maxSvc = topServices[0]?.count || 1;

  return (
    <>
      {/* Metrics — grid-cols-4 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="الإيراد" value={fmtValue(kpis.revenue, 'sar')} sub="ضمن النطاق المحدّد" />
        <MetricCard icon={Activity} label="العمليات" value={fmtValue(kpis.orders, 'int')} sub="ضمن النطاق المحدّد" />
        <MetricCard icon={Users} label="حمل الفنّيين" value={`${kpis.techLoad || 0}%`} sub="نسبة الانشغال" />
        <MetricCard icon={HeartPulse} label="الكفاءة" value={`${kpis.efficiency || 0}%`} sub="معدّل الإنجاز" />
      </div>

      {/* Master chart — follows the Global Control Bar metric toggle */}
      <UnifiedChart title="تحليل الأداء" />

      {/* Status donut + top services — grid-cols-3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm lg:col-span-1">
          <div className="text-lg font-bold tracking-tight text-slate-900">توزيع الحالات</div>
          <div className="mt-1 mb-6 text-sm font-medium text-secondary">إجمالي {windowCount.toLocaleString('en-US')} طلب</div>
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
                  <span className="font-inter text-3xl font-bold tabular-nums text-slate-900" dir="ltr">{windowCount}</span>
                  <span className="text-[10px] text-slate-400">طلب</span>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-secondary"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">لا توجد بيانات ضمن النطاق</div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-8 shadow-sm lg:col-span-2">
          <div className="text-lg font-bold tracking-tight text-slate-900">أفضل الخدمات</div>
          <div className="mt-1 mb-6 text-sm font-medium text-secondary">الأكثر طلباً مع إيرادها</div>
          {topServices.length ? (
            <div className="space-y-5">
              {topServices.map((s, i) => (
                <div key={s.name + i}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 font-semibold text-slate-700">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 font-inter text-[11px] font-bold text-secondary" dir="ltr">{i + 1}</span>
                      {s.name}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-xs font-medium text-slate-400">{s.count} طلب</span>
                      <span className="font-inter font-semibold tabular-nums text-slate-900" dir="ltr">{fmtValue(s.revenue, 'sar')}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600 transition-all duration-700 ease-out" style={{ width: `${Math.max(6, Math.round((s.count / maxSvc) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-14 text-center text-sm text-slate-400">لا توجد خدمات ضمن النطاق</div>
          )}
        </div>
      </div>

      {/* Live operations */}
      <div>
        <div className="mb-3 text-lg font-bold tracking-tight text-slate-900">العمليات الحيّة</div>
        {live.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((o) => (
              <div key={o.id} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:scale-[1.01] hover:shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{o.plate || '—'}</span>
                  <StatusPill status={o.status} />
                </div>
                <div className="text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
                <div className="mt-1 text-xs font-normal text-slate-400">{o.customer_name || 'عميل'} · {nameByUser[o.assigned_to] || 'غير مكلّف'}</div>
                {o.assigned_to ? (
                  <button onClick={() => setModalOrder(o)}
                    className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-blue-700">
                    {o.status === 'in_progress' ? 'متابعة المهمة' : 'بدء المهمة'}
                  </button>
                ) : (
                  <div className="mt-4"><AssignControl orderId={o.id} workers={workers} onAssigned={(id, uid) => patchOrder(id, { assigned_to: uid })} /></div>
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
          <StartTaskModal key="m" order={modalOrder} inventory={inventory} onClose={() => setModalOrder(null)} onStarted={(id) => patchOrder(id, { status: 'in_progress' })} />
        )}
      </AnimatePresence>
    </>
  );
}
