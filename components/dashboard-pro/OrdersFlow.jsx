'use client';

/**
 * OrdersFlow — live workshop order management.
 * Each order shows a 3-stage toggle (انتظار → جاري العمل → تم) wired to the
 * `updateOrderStatus` Server Action. Optimistic UI: the badge updates instantly
 * on click; if the server write fails we restore the previous snapshot (revert).
 * (useState-based optimism — useOptimistic isn't available in React 18.3.)
 */
import { useState, useEffect } from 'react';
import { updateOrderStatus } from '@/app/dashboard-pro/actions';
import NoData from './NoData';
import StartTaskModal from './StartTaskModal';

// Live elapsed-time counter. Initialised after mount (now=null on first render)
// to avoid a server/client hydration mismatch, then ticks every 30s.
function fmtElapsed(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س ${m % 60} د`;
  const d = Math.floor(h / 24);
  return `منذ ${d} ي ${h % 24} س`;
}
function Elapsed({ since }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!since || now === null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 tabular-nums" dir="rtl">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      {fmtElapsed(now - new Date(since).getTime())}
    </span>
  );
}

const STAGES = [
  { k: 'pending', label: 'انتظار', active: 'border-amber-500 bg-amber-500 text-white', dot: 'bg-amber-500' },
  { k: 'in_progress', label: 'جاري العمل', active: 'border-blue-600 bg-blue-600 text-white', dot: 'bg-blue-600' },
  { k: 'completed', label: 'تم', active: 'border-emerald-600 bg-emerald-600 text-white', dot: 'bg-emerald-600' },
];
const LABEL = { pending: 'انتظار', in_progress: 'جاري العمل', ready: 'جاهز', completed: 'تم' };
const DOT = { pending: 'bg-amber-500', in_progress: 'bg-blue-600', ready: 'bg-violet-600', completed: 'bg-emerald-600' };

export default function OrdersFlow({ orders = [], inventory = [] }) {
  const [items, setItems] = useState(orders);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);

  function handleStarted(orderId) {
    setItems((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'in_progress' } : o)));
    setToast({ ok: true, msg: 'بدأت المهمة وخُصمت القطع' });
    setTimeout(() => setToast(null), 2600);
  }

  async function setStage(order, status) {
    if (order.status === status || busyId) return;
    // Moving to "in progress" requires the start modal (plate + service + parts).
    if (status === 'in_progress') {
      setModalOrder(order);
      return;
    }
    const snapshot = items;
    setItems((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o))); // optimistic, instant
    setBusyId(order.id);
    try {
      const res = await updateOrderStatus(order.id, status);
      if (!res?.ok) {
        setItems(snapshot); // revert
        setToast({ ok: false, msg: res?.error || 'تعذّر تحديث الحالة' });
      } else {
        setToast({ ok: true, msg: 'تم تحديث الحالة' });
      }
    } catch (e) {
      setItems(snapshot); // revert on network error
      setToast({ ok: false, msg: 'تعذّر الاتصال' });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2600);
    }
  }

  if (!items.length) return <NoData title="لا توجد طلبات" hint="لا توجد طلبات ورشة لعرضها حالياً." />;

  return (
    <div className="space-y-3">
      {items.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 flex-none rounded-full ${DOT[o.status] || 'bg-slate-400'}`} />
                <span className="truncate font-bold text-slate-900">{o.customer_name || 'عميل'}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">{LABEL[o.status] || o.status}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500">
                <span>{[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}</span>
                {o.plate ? <span dir="ltr">· {o.plate}</span> : null}
                {o.service_type ? <span>· {o.service_type}</span> : null}
                <Elapsed since={o.started_at || o.created_at} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => {
                const on = o.status === s.k;
                return (
                  <button key={s.k} onClick={() => setStage(o, s.k)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${on ? s.active : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {toast && (
        <div className={`pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-bold text-white lg:bottom-6 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {modalOrder && (
        <StartTaskModal
          order={modalOrder}
          inventory={inventory}
          onClose={() => setModalOrder(null)}
          onStarted={handleStarted}
        />
      )}
    </div>
  );
}
