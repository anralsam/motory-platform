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
import { Wallet, Activity, Users, HeartPulse } from 'lucide-react';
import StatTile from './StatTile';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import NoData from './NoData';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

export default function MerchantDashboard({ metrics = {}, orders = [], inventory = [], workers = [] }) {
  const [items, setItems] = useState(orders);
  const [modalOrder, setModalOrder] = useState(null);
  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));

  function onStarted(id) {
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'in_progress' } : o)));
  }

  return (
    <div className="space-y-6">
      {/* 4 hero cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} tone="blue" label="الإيراد اليومي" value={sar(metrics.revenue)} sub="من الطلبات المكتملة" />
        <StatTile icon={Activity} tone="blue" label="الطلبات النشطة" value={(metrics.active || 0).toLocaleString('en-US')} sub="جارية الآن" />
        <StatTile icon={Users} tone="blue" label="حمل الفنّيين" value={`${metrics.techLoad || 0}%`} sub="نسبة الانشغال" />
        <StatTile icon={HeartPulse} tone="blue" label="صحة المركز" value={`${metrics.health || 0}%`} sub="معدّل الإنجاز" />
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
