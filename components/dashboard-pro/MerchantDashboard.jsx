'use client';

/**
 * MerchantDashboard — /dashboard-pro merchant surface.
 * Mounts the Grand Unified DNA container, then renders the shared AnalyticsPanel
 * (premium cards + master chart + donut + top services) followed by the merchant's
 * Live Operations grid (assign / start task) — all on the centralized optimistic
 * actions. The AnalyticsPanel is shared verbatim with the legacy /dashboard owner
 * section, guaranteeing 100% parity.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardContainer, { useActions } from './dna/DashboardContainer';
import AnalyticsPanel from './dna/AnalyticsPanel';
import StatusPill from './StatusPill';
import StartTaskModal from './StartTaskModal';
import AssignControl from './AssignControl';
import NoData from './NoData';
import { updateOrderStatus, assignOrderToWorker, startOrderWithParts, deductParts } from '@/app/dashboard-pro/actions';

export default function MerchantDashboard({ orders = [], workers = [], inventory = [] }) {
  return (
    <DashboardContainer role="merchant" orders={orders} workers={workers} inventory={inventory}
      actions={{ updateOrderStatus, assignOrderToWorker, startOrderWithParts, deductParts }}>
      <AnalyticsPanel />
      <MerchantLiveOps />
    </DashboardContainer>
  );
}

function MerchantLiveOps() {
  const { orders, inventory, workers, patchOrder } = useActions();
  const [modalOrder, setModalOrder] = useState(null);
  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));
  const live = orders.filter((o) => o.status !== 'completed').slice(0, 12);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}>
      <div className="mb-4 text-lg font-bold tracking-tight text-slate-900">العمليات الحيّة</div>
      {live.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {live.map((o) => (
            <div key={o.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold tracking-widest text-slate-900" dir="ltr">{o.plate || '—'}</span>
                <StatusPill status={o.status} />
              </div>
              <div className="text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
              <div className="mt-1.5 text-xs font-medium text-slate-500">{o.customer_name || 'عميل'} · {nameByUser[o.assigned_to] || 'غير مكلّف'}</div>
              {o.assigned_to ? (
                <button onClick={() => setModalOrder(o)}
                  className="mt-6 w-full rounded-xl bg-[#2563eb] py-3 text-sm font-semibold text-white transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-blue-700">
                  {o.status === 'in_progress' ? 'متابعة المهمة' : 'بدء المهمة'}
                </button>
              ) : (
                <div className="mt-6"><AssignControl orderId={o.id} workers={workers} onAssigned={(id, uid) => patchOrder(id, { assigned_to: uid })} /></div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <NoData title="لا توجد عمليات حيّة" hint="كل الطلبات مكتملة أو لا توجد طلبات نشطة." />
      )}

      <AnimatePresence>
        {modalOrder && (
          <StartTaskModal key="m" order={modalOrder} inventory={inventory} onClose={() => setModalOrder(null)} onStarted={(id) => patchOrder(id, { status: 'in_progress' })} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
