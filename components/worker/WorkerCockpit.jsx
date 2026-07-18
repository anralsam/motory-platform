'use client';

/**
 * WorkerCockpit — the shop-floor workspace. Mobile-first, high-contrast, isolated.
 * Fast task toggles (بدء العمل / جاهز للتسليم / تم التسليم) that call the RLS-safe
 * workerToggleOrder action and update optimistically (sub-100ms), reverting on
 * failure. RTL throughout with CSS logical properties only.
 */
import { useMemo, useState } from 'react';
import { workerToggleOrder, workerSignOut } from '@/app/worker/actions';

const FLOW = {
  pending: { next: 'in_progress', cta: 'بدء العمل', tone: 'bg-blue-600 hover:bg-blue-700' },
  in_progress: { next: 'ready', cta: 'جاهز للتسليم', tone: 'bg-violet-600 hover:bg-violet-700' },
  ready: { next: 'completed', cta: 'تم التسليم', tone: 'bg-emerald-600 hover:bg-emerald-700' },
};
const STATUS_LABEL = { pending: 'بالانتظار', in_progress: 'قيد العمل', ready: 'جاهز', completed: 'مُسلّم' };
const STATUS_TONE = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-50 text-blue-700',
  ready: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

export default function WorkerCockpit({ workerName, branchName, initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');

  const active = useMemo(() => orders.filter((o) => o.status !== 'completed'), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === 'completed').length, [orders]);

  async function advance(order) {
    const step = FLOW[order.status];
    if (!step) return;
    setErr('');
    setBusyId(order.id);
    const prev = orders;
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: step.next } : o))); // optimistic
    const res = await workerToggleOrder(order.id, step.next);
    setBusyId(null);
    if (!res?.ok) { setOrders(prev); setErr(res?.error || 'تعذّر تحديث الحالة'); }
  }

  async function signOut() {
    await workerSignOut();
    window.location.href = '/worker/login';
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 pb-10">
      {/* Header — its own shell, no merchant nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <div className="truncate text-base font-black tracking-tight text-slate-900">{workerName}</div>
            <div className="truncate text-xs font-semibold text-slate-500">
              {branchName ? `فرع ${branchName}` : 'ورشة'} · {active.length} مهمة نشطة · {done} مُسلّمة
            </div>
          </div>
          <button onClick={signOut}
            className="flex-none rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
            خروج
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {err && <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-700">{err}</p>}

        {active.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-500">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div className="text-base font-black text-slate-900">لا مهام نشطة الآن</div>
            <p className="mt-1 text-sm font-medium text-slate-500">ستظهر السيارات المُسندة إليك هنا فور تكليفك.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((o) => {
              const step = FLOW[o.status];
              return (
                <li key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-900">{o.customer_name || 'عميل'}</div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-slate-500">
                        {[o.car_make, o.car_model].filter(Boolean).join(' ') || 'مركبة'}
                        {o.plate ? <span dir="ltr" className="tabular-nums"> · {o.plate}</span> : null}
                      </div>
                      {o.service_type ? <div className="mt-1 text-xs font-bold text-slate-400">{o.service_type}</div> : null}
                    </div>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-black ${STATUS_TONE[o.status] || STATUS_TONE.pending}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  {step && (
                    <button onClick={() => advance(o)} disabled={busyId === o.id}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white transition disabled:opacity-60 ${step.tone}`}>
                      {busyId === o.id ? 'جارٍ…' : step.cta}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
