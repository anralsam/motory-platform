'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTasks } from '@/lib/useTasks';
import { FLOW, META, STAMP_FOR, elapsedMins, elapsedLabel, LATE_MIN, COL_TINT, ACTION_BTN } from '@/lib/orderFlow';
import Toast from '@/components/Toast';

export default function WorkerTasksPage() {
  const router = useRouter();
  const [ctx, setCtx] = useState({ uid: null, centerId: null, branchId: null, name: '', center: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) { router.replace('/auth/signin'); return; }
      const m = u.user_metadata || {};
      setCtx({ uid: u.id, centerId: m.center_id || u.id, branchId: m.branch_id || null, name: m.full_name || m.phone || 'الفني', center: m.center_name || '' });
    });
  }, [router]);

  const { tasks, loading, error, refetch, patch } = useTasks(ctx.centerId, ctx.branchId, ctx.uid);

  // Toast
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2400);
  }

  // Re-render every minute so "time elapsed" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  // Best-effort realtime: refetch when my orders change elsewhere.
  useEffect(() => {
    if (!ctx.uid) return;
    let ch;
    try {
      ch = supabase
        .channel('worker-orders-' + ctx.uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'assigned_to=eq.' + ctx.uid }, () => refetch())
        .subscribe();
    } catch (e) {}
    return () => { try { supabase.removeChannel(ch); } catch (e) {} };
  }, [ctx.uid, refetch]);

  // Optimistic status change + background patch.
  async function setStatus(id, newStatus) {
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === newStatus || !FLOW.includes(newStatus)) return;
    const prevStatus = t.status;
    const upd = { status: newStatus, updated_at: new Date().toISOString() };
    const stamp = STAMP_FOR[newStatus];
    if (stamp && !t[stamp]) upd[stamp] = new Date().toISOString();
    patch(id, upd); // instant
    const { error: err } = await supabase.from('orders').update(upd).eq('id', id);
    if (err) { patch(id, { status: prevStatus }); showToast('تعذّر التحديث', 'error'); return; }
    showToast('✅ تم تحديث الحالة');
  }
  function advance(id) {
    const t = tasks.find((x) => x.id === id);
    const nx = META[t?.status]?.next;
    if (nx) setStatus(id, nx);
  }

  const grouped = useMemo(() => {
    const g = {}; FLOW.forEach((s) => (g[s] = []));
    tasks.forEach((t) => { (g[t.status] || g.pending).push(t); });
    return g;
  }, [tasks]);

  // Desktop drag-and-drop (native HTML5).
  const dragId = useRef(null);
  const onDragStart = (e, id) => { dragId.current = id; try { e.dataTransfer.setData('text/plain', id); } catch (_) {} };
  const onDrop = (e, status) => { e.preventDefault(); const id = dragId.current || e.dataTransfer.getData('text/plain'); dragId.current = null; if (id) setStatus(id, status); };

  async function signOut() { await supabase.auth.signOut(); router.replace('/auth/signin'); router.refresh(); }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header (stripped — operational only) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-violet text-white">
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none"><path d="M6 10 L24 42 L42 10" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div>
            <div className="text-sm font-extrabold text-slate-900">مهامي</div>
            <div className="text-[11px] text-slate-500">{ctx.name}{ctx.center ? ' · ' + ctx.center : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="تحديث">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          </button>
          <button onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">خروج</button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-4">
        {loading ? (
          <div className="grid place-items-center py-24 text-sm text-slate-400">جاري تحميل المهام...</div>
        ) : error ? (
          <div className="grid place-items-center py-24 text-sm text-red-500">تعذّر التحميل: {error}</div>
        ) : tasks.length === 0 ? (
          <div className="grid place-items-center py-24 text-center">
            <div className="text-base font-bold text-slate-700">لا توجد مهام موكلة إليك حالياً ✅</div>
            <div className="mt-1 text-sm text-slate-500">ستظهر السيارات الجديدة هنا فور إسنادها لك.</div>
          </div>
        ) : (
          <>
            {/* ── Desktop / tablet: 4-column Kanban ── */}
            <div className="hidden gap-3 md:grid md:grid-cols-4">
              {FLOW.map((status) => {
                const m = META[status];
                return (
                  <div key={status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, status)} className="flex flex-col rounded-2xl bg-slate-100/70 p-2">
                    <div className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-extrabold ring-1 ring-inset ${COL_TINT[m.col]}`}>
                      <span>{m.ar}</span>
                      <span className="rounded-full bg-white/70 px-2 text-xs">{grouped[status].length}</span>
                    </div>
                    <div className="flex min-h-[120px] flex-col gap-2">
                      {grouped[status].map((o) => (
                        <Card key={o.id} order={o} draggable onDragStart={(e) => onDragStart(e, o.id)} onAction={() => advance(o.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Mobile: single vertical list grouped by status, big tap targets ── */}
            <div className="space-y-5 md:hidden">
              {FLOW.map((status) => {
                const m = META[status];
                if (!grouped[status].length) return null;
                return (
                  <div key={status}>
                    <div className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ring-1 ring-inset ${COL_TINT[m.col]}`}>
                      {m.ar} <span className="opacity-70">({grouped[status].length})</span>
                    </div>
                    <div className="space-y-3">
                      {grouped[status].map((o) => (
                        <Card key={o.id} order={o} mobile onAction={() => advance(o.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Toast toast={toast} />
    </div>
  );
}

/* ── Car card ── */
function Card({ order, draggable, mobile, onDragStart, onAction }) {
  const m = META[order.status];
  const mins = elapsedMins(order);
  const late = mins != null && mins >= LATE_MIN && order.status !== 'completed';
  const car = [order.car_make, order.car_model].filter(Boolean).join(' ') || 'مركبة';

  return (
    <div
      draggable={draggable || undefined}
      onDragStart={onDragStart}
      className={`rounded-2xl border bg-white p-3.5 shadow-sm ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${late ? 'border-red-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900">{car}</div>
          {order.customer_name && <div className="truncate text-xs text-slate-500">{order.customer_name}</div>}
        </div>
        <Plate plate={order.plate} />
      </div>

      {order.service_type && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" /></svg>
          {order.service_type}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${late ? 'text-red-600' : 'text-slate-400'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          {elapsedLabel(mins)} {late && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600">متأخرة</span>}
        </span>
        {/* desktop quick-advance */}
        {!mobile && m.action && (
          <button onClick={onAction} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold text-white ${ACTION_BTN[m.actionColor]}`}>{m.action}</button>
        )}
      </div>

      {/* mobile: MASSIVE action button */}
      {mobile && m.action && (
        <button onClick={onAction} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-extrabold text-white ${ACTION_BTN[m.actionColor]}`}>
          {m.action}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      )}
    </div>
  );
}

/* ── Saudi-style license plate ── */
function Plate({ plate }) {
  return (
    <div className="flex flex-none items-stretch overflow-hidden rounded-md border-2 border-gray-800 bg-white font-mono ltr">
      <span className="flex items-center bg-gray-800 px-1 text-[8px] font-bold leading-none text-white">KSA</span>
      <span className="px-2 py-1 text-sm font-extrabold tracking-widest text-slate-900">{plate || '—'}</span>
    </div>
  );
}
