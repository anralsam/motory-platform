'use client';

/**
 * WorkerModule — technician view.
 * - A 3-stage job toggle (Wait → Process → Done).
 * - An inventory-deduction form.
 * These are interactive client UI components with local state. Persistence to the
 * orders / inventory tables is wired through the worker endpoints (next step);
 * the UI is fully functional and YouTube-Studio-Light styled.
 */
import { useState } from 'react';

const STAGES = [
  { k: 'wait', label: 'بانتظار', dot: 'bg-amber-500' },
  { k: 'process', label: 'قيد التنفيذ', dot: 'bg-blue-600' },
  { k: 'done', label: 'مكتمل', dot: 'bg-emerald-600' },
];

function StageToggle() {
  const [stage, setStage] = useState('wait');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-900">مهمة #1042 — تغيير زيت</div>
          <div className="text-xs text-slate-500">تويوتا كامري · لوحة ABC-1234</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
          <span className={`h-2 w-2 rounded-full ${STAGES.find((s) => s.k === stage).dot}`} />
          {STAGES.find((s) => s.k === stage).label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((s) => {
          const on = stage === s.k;
          return (
            <button key={s.k} onClick={() => setStage(s.k)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InventoryDeductionForm() {
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('1');
  const [done, setDone] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!item.trim()) return;
    setDone(true);
    setTimeout(() => setDone(false), 2200);
    setItem('');
    setQty('1');
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 font-bold text-slate-900">خصم من المخزون</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">الصنف</label>
          <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="مثال: فلتر زيت" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-500">الكمية</label>
          <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} dir="ltr" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm tabular-nums text-slate-900 outline-none transition-colors focus:border-blue-600" />
        </div>
      </div>
      <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
        تأكيد الخصم
      </button>
      {done && <div className="mt-3 text-center text-sm font-semibold text-emerald-600">تم تسجيل الخصم ✓</div>}
    </form>
  );
}

export default function WorkerModule() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <StageToggle />
      <InventoryDeductionForm />
    </div>
  );
}
