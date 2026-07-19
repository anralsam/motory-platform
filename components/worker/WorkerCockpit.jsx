'use client';

/**
 * WorkerCockpit — the shop floor's primary data-entry + transactional engine.
 * The technician onboards vehicles AND drives the whole pipeline; the owner is
 * hands-off. Mobile-first, high-contrast, isolated (its own shell). Every write
 * is optimistic (sub-100ms) and reverts on server failure. RTL, logical props.
 *
 * All mutations are authorized server-side against the worker's ACTIVE row, so a
 * blocked account cannot create or move anything even mid-session.
 */
import { useMemo, useState } from 'react';
import { Plus, X, Wrench, CheckCircle2, LogOut, Car } from 'lucide-react';
import { createWorkerOrder, workerToggleOrder, workerSignOut } from '@/app/worker/actions';

// waiting → in_progress → ready, with the spec's exact shop-floor labels.
const FLOW = {
  pending:     { next: 'in_progress', cta: '⚙️ بدء العمل على المركبة',        tone: 'bg-blue-600 hover:bg-blue-700' },
  in_progress: { next: 'ready',       cta: '✅ انتهت الصيانة / جاهزة للاستلام', tone: 'bg-emerald-600 hover:bg-emerald-700' },
};
const STATUS_LABEL = { pending: 'في الانتظار', in_progress: 'جاري العمل', ready: 'جاهزة للاستلام', completed: 'مُسلّمة' };
const STATUS_TONE = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-500',
};

// Display-only Saudi formatting (the server normalizes authoritatively).
function fmtPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '').slice(0, 12);
  if (d.startsWith('9665')) return '0' + d.slice(3);
  return d;
}
const sar = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ⃁`;

export default function WorkerCockpit({ workerName, branchName, initialOrders, services = [] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState('');
  const [intakeOpen, setIntakeOpen] = useState(false);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'completed'), [orders]);
  const done = useMemo(() => orders.filter((o) => o.status === 'completed').length, [orders]);
  const serviceCats = useMemo(() => [...new Set(services.map((s) => s.category || 'خدمات'))], [services]);

  async function advance(order) {
    const step = FLOW[order.status];
    if (!step) return;
    setErr(''); setBusyId(order.id);
    const prev = orders;
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: step.next } : o)));
    const res = await workerToggleOrder(order.id, step.next);
    setBusyId(null);
    if (!res?.ok) { setOrders(prev); setErr(res?.error || 'تعذّر تحديث الحالة'); }
  }

  async function signOut() { await workerSignOut(); window.location.href = '/worker/login'; }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <div className="truncate text-base font-black tracking-tight text-slate-900">{workerName}</div>
            <div className="truncate text-xs font-bold text-slate-500">
              {branchName ? `فرع ${branchName}` : 'ورشة'} · {activeOrders.length} نشطة · {done} مُسلّمة
            </div>
          </div>
          <button onClick={signOut} className="flex-none rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50">
            <LogOut size={14} className="inline" /> خروج
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {/* Intake CTA — the primary shop-floor action */}
        <button onClick={() => { setErr(''); setIntakeOpen(true); }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-black text-white shadow-sm transition hover:bg-slate-800">
          <Plus size={20} strokeWidth={3} /> تسجيل مركبة جديدة
        </button>

        {err && <p className="mb-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-black text-rose-700">{err}</p>}

        {activeOrders.length === 0 ? (
          <div className="mt-14 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-500"><Car size={26} /></div>
            <div className="text-base font-black text-slate-900">لا مركبات في الطابور</div>
            <p className="mt-1 text-sm font-bold text-slate-500">اضغط «تسجيل مركبة جديدة» لبدء أول عملية.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activeOrders.map((o) => {
              const step = FLOW[o.status];
              return (
                <li key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black text-slate-900">{o.customer_name || 'عميل'}</div>
                      <div className="mt-0.5 truncate text-sm font-bold text-slate-500">
                        {o.car_model || o.car_make || 'مركبة'}
                        {o.plate ? <span dir="ltr" className="tabular-nums"> · {o.plate}</span> : null}
                      </div>
                      {o.service_type ? (
                        <div className="mt-1 flex items-center gap-2 text-xs font-black text-slate-400">
                          <span>{o.service_type}</span>
                          {o.price ? <span dir="ltr" className="tabular-nums text-slate-500">{sar(o.price)}</span> : null}
                        </div>
                      ) : null}
                    </div>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-black ${STATUS_TONE[o.status] || STATUS_TONE.pending}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  {step ? (
                    <button onClick={() => advance(o)} disabled={busyId === o.id}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white transition disabled:opacity-60 ${step.tone}`}>
                      {busyId === o.id ? 'جارٍ…' : step.cta}
                    </button>
                  ) : (
                    <div className="rounded-xl bg-emerald-50 py-3 text-center text-sm font-black text-emerald-700">
                      <CheckCircle2 size={16} className="inline" /> جاهزة للاستلام
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {intakeOpen && (
        <IntakeTray
          services={services}
          serviceCats={serviceCats}
          onClose={() => setIntakeOpen(false)}
          onCreated={(order) => { setOrders((l) => [order, ...l]); setIntakeOpen(false); }}
          onError={setErr}
        />
      )}
    </main>
  );
}

/* ── Mobile intake tray — slides up from the bottom on touch devices ── */
function IntakeTray({ services, serviceCats, onClose, onCreated, onError }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [cat, setCat] = useState(serviceCats[0] || '');
  const [serviceId, setServiceId] = useState('');
  const [startNow, setStartNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState('');

  const inCat = services.filter((s) => (s.category || 'خدمات') === cat);

  async function submit(e) {
    e.preventDefault();
    setLocalErr('');
    if (!plate.trim()) { setLocalErr('رقم اللوحة مطلوب'); return; }
    setSaving(true);
    const res = await createWorkerOrder({
      customerPhone: phone, customerName: name, plate, carModel: model,
      serviceId: serviceId || null, startNow,
    });
    setSaving(false);
    if (res?.ok && res.order) onCreated(res.order);
    else { setLocalErr(res?.error || 'تعذّر تسجيل المركبة'); onError?.(''); }
  }

  const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-base font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white';

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 pb-8 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">تسجيل مركبة جديدة</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-600">رقم جوال العميل</label>
            <input value={phone} onChange={(e) => setPhone(fmtPhone(e.target.value))} inputMode="tel" dir="ltr" className={`${INPUT} tabular-nums`} placeholder="05xxxxxxxx" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-600">اسم العميل</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="اسم العميل (اختياري)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-600">رقم اللوحة *</label>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" className={`${INPUT} text-center tracking-widest`} placeholder="أ ب ج 1234" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-600">الطراز</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} className={INPUT} placeholder="مثال: كامري 2020" />
            </div>
          </div>

          {/* Service catalog picker — fixed pricing, no free typing */}
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-600">نوع الخدمة</label>
            {services.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-black text-amber-700">لا توجد خدمات معرّفة لهذا الفرع — يضيفها المالك من الإعدادات.</p>
            ) : (
              <>
                {serviceCats.length > 1 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {serviceCats.map((c) => (
                      <button type="button" key={c} onClick={() => { setCat(c); setServiceId(''); }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${cat === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{c}</button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {inCat.map((s) => (
                    <button type="button" key={s.id} onClick={() => setServiceId(s.id)}
                      className={`flex items-center justify-between rounded-xl border-2 px-3.5 py-3 text-start transition ${serviceId === s.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <span className="text-sm font-black text-slate-900">{s.name}</span>
                      <span dir="ltr" className="text-sm font-black tabular-nums text-slate-500">{sar(s.price)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <label className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
            <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} className="h-5 w-5 rounded accent-blue-600" />
            <span className="text-sm font-black text-slate-700">ابدأ العمل عليها فوراً</span>
          </label>

          {localErr && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-black text-rose-700">{localErr}</p>}

          <button type="submit" disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-base font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
            <Wrench size={18} />{saving ? 'جارٍ التسجيل…' : 'تسجيل المركبة وبدء العملية'}
          </button>
        </form>
      </div>
    </div>
  );
}
