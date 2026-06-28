'use client';

/**
 * OrdersFlow — Technician Action Center (field-optimized).
 *   • Card-based tasks; tap a card → start modal (framer-motion).
 *   • Swipe a card sideways → completes the task (one-thumb gesture).
 *   • Big thumb-friendly stage buttons (44px min) + quick status filters.
 *   • Live SLA timer on in-progress tasks (turns amber/rose when overdue).
 *   • Optimistic; completing animates the card out + success toast. No reloads.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateOrderStatus } from '@/app/dashboard-pro/actions';
import NoData from './NoData';
import StartTaskModal from './StartTaskModal';

function fmtElapsed(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س ${m % 60} د`;
  return `منذ ${Math.floor(h / 24)} ي ${h % 24} س`;
}
function Elapsed({ since }) {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  if (!since || now === null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500" dir="rtl">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      {fmtElapsed(now - new Date(since).getTime())}
    </span>
  );
}
// Live SLA count-up (mm:ss). Expected ≤45m (amber after), overdue after 60m (rose).
function SlaTimer({ since }) {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!since || now === null) return null;
  const sec = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const mm = Math.floor(sec / 60), ss = sec % 60;
  const cls = mm >= 60 ? 'bg-rose-50 text-rose-600' : mm >= 45 ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`} dir="ltr">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      {mm}:{String(ss).padStart(2, '0')}
    </span>
  );
}

const STAGES = [
  { k: 'pending', label: 'انتظار', active: 'border-amber-500 bg-amber-500 text-white' },
  { k: 'in_progress', label: 'جاري العمل', active: 'border-indigo-600 bg-indigo-600 text-white' },
  { k: 'completed', label: 'تم', active: 'border-emerald-600 bg-emerald-600 text-white' },
];
const FILTERS = [
  { k: 'all', label: 'الكل' },
  { k: 'pending', label: 'انتظار' },
  { k: 'in_progress', label: 'جاري' },
  { k: 'ready', label: 'جاهز' },
];
const LABEL = { pending: 'انتظار', in_progress: 'جاري العمل', ready: 'جاهز', completed: 'تم' };
const DOT = { pending: 'bg-amber-500', in_progress: 'bg-indigo-600', ready: 'bg-violet-600', completed: 'bg-emerald-600' };

export default function OrdersFlow({ orders = [], inventory = [] }) {
  const [items, setItems] = useState(orders);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [filter, setFilter] = useState('all');

  function flash(t) { setToast(t); setTimeout(() => setToast(null), 2600); }

  function handleStarted(orderId) {
    setItems((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'in_progress', started_at: new Date().toISOString() } : o)));
    flash({ ok: true, msg: 'بدأت المهمة وخُصمت القطع' });
  }

  async function complete(order) {
    if (busyId) return;
    setBusyId(order.id);
    const snapshot = items;
    setItems((prev) => prev.filter((o) => o.id !== order.id)); // optimistic exit
    const res = await updateOrderStatus(order.id, 'completed');
    setBusyId(null);
    if (!res?.ok) { setItems(snapshot); flash({ ok: false, msg: res?.error || 'تعذّر الإكمال' }); }
    else flash({ ok: true, msg: 'اكتملت المهمة ✓' });
  }

  async function setStage(order, status) {
    if (busyId || status === order.status) return;
    if (status === 'in_progress') { setModalOrder(order); return; }
    if (status === 'completed') { complete(order); return; }
    setBusyId(order.id);
    const snapshot = items;
    setItems((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    const res = await updateOrderStatus(order.id, status);
    setBusyId(null);
    if (!res?.ok) { setItems(snapshot); flash({ ok: false, msg: res?.error || 'تعذّر التحديث' }); }
  }

  const counts = items.reduce((a, o) => ((a[o.status] = (a[o.status] || 0) + 1), a), {});
  const visible = filter === 'all' ? items : items.filter((o) => o.status === filter);

  if (!items.length) return <NoData title="لا توجد مهام نشطة" hint="أنجزت كل مهامك — عمل رائع 🎉" />;

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.k;
          const n = f.k === 'all' ? items.length : counts[f.k] || 0;
          return (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${on ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
              {f.label}<span className={`tabular-nums ${on ? 'text-white/70' : 'text-slate-400'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((o) => (
          <motion.div key={o.id} layout
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative overflow-hidden rounded-2xl"
          >
            {/* swipe-to-complete reveal */}
            <div className="absolute inset-0 flex items-center justify-between bg-emerald-500 px-6 text-sm font-bold text-white">
              <span>✓ إكمال</span><span>✓ إكمال</span>
            </div>
            {/* draggable card */}
            <motion.div
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5}
              onDragEnd={(e, info) => { if (Math.abs(info.offset.x) > 120) complete(o); }}
              className="relative cursor-grab rounded-2xl border border-slate-100 bg-white p-4 shadow-sm active:cursor-grabbing sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => setModalOrder(o)} className="min-w-0 flex-1 text-start" title="فتح إجراءات المهمة">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2 w-2 flex-none rounded-full ${DOT[o.status] || 'bg-slate-400'}`} />
                    <span className="truncate text-sm font-semibold text-slate-900">{o.customer_name || 'عميل'}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{LABEL[o.status] || o.status}</span>
                    {o.status === 'in_progress' ? <SlaTimer since={o.started_at || o.created_at} /> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-normal text-slate-400">
                    <span>{[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}</span>
                    {o.plate ? <span dir="ltr">· {o.plate}</span> : null}
                    {o.service_type ? <span>· {o.service_type}</span> : null}
                    {o.status !== 'in_progress' ? <Elapsed since={o.started_at || o.created_at} /> : null}
                  </div>
                </button>
                <div className="grid w-full grid-cols-3 gap-1.5 sm:w-auto">
                  {STAGES.map((s) => {
                    const on = o.status === s.k;
                    return (
                      <button key={s.k} onClick={() => setStage(o, s.k)} disabled={busyId === o.id}
                        className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-50 ${on ? s.active : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 active:bg-slate-50'}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {visible.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">لا مهام في هذا الفلتر</p> : null}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-6 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOrder && (
          <StartTaskModal key="modal" order={modalOrder} inventory={inventory} onClose={() => setModalOrder(null)} onStarted={handleStarted} />
        )}
      </AnimatePresence>
    </div>
  );
}
