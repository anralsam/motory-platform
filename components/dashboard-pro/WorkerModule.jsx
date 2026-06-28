'use client';

/**
 * WorkerModule — technician view.
 * - Live order flow (3-stage toggle wired to the updateOrderStatus Server Action).
 * - An inventory-deduction form (local UI; persistence wired next).
 */
import { useState } from 'react';
import OrdersFlow from './OrdersFlow';

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

export default function WorkerModule({ orders = [] }) {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 text-base font-extrabold text-slate-900">مهامي النشطة</h3>
        <OrdersFlow orders={orders} />
      </section>
      <InventoryDeductionForm />
    </div>
  );
}
