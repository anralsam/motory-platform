'use client';

/**
 * StartTaskModal — opens when a technician moves a task to "In Progress".
 * Forces: (a) license plate, (b) service type, (c) parts used (deducted from
 * inventory). Submits via the startOrderWithParts Server Action, which validates
 * stock + authorization server-side before any write.
 */
import { useState } from 'react';
import { startOrderWithParts } from '@/app/dashboard-pro/actions';

export default function StartTaskModal({ order, inventory = [], onClose, onStarted }) {
  const [plate, setPlate] = useState(order?.plate || '');
  const [serviceType, setServiceType] = useState(order?.service_type || '');
  const [rows, setRows] = useState([]); // { itemId, qty }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const used = new Set(rows.map((r) => r.itemId));
  const available = inventory.filter((i) => !used.has(i.id));

  function addRow() {
    if (!available.length) return;
    setRows((r) => [...r, { itemId: available[0].id, qty: 1 }]);
  }
  function setRow(i, patch) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!plate.trim() || !serviceType.trim()) {
      setError('اللوحة ونوع الخدمة مطلوبان');
      return;
    }
    setBusy(true);
    const res = await startOrderWithParts(order.id, {
      plate: plate.trim(),
      serviceType: serviceType.trim(),
      parts: rows.map((r) => ({ itemId: r.itemId, qty: Number(r.qty) })),
    });
    setBusy(false);
    if (res?.ok) {
      onStarted?.(order.id);
      onClose?.();
    } else {
      setError(res?.error || 'تعذّر بدء المهمة');
    }
  }

  function nameOf(id) {
    const it = inventory.find((x) => x.id === id);
    return it ? `${it.name} (${it.quantity} ${it.unit || ''})` : '';
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">بدء المهمة — {order?.customer_name || 'عميل'}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">رقم اللوحة *</label>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" placeholder="ABC-1234"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">نوع الخدمة *</label>
              <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="تغيير زيت"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500">القطع المستخدمة (تُخصم من المخزون)</label>
              <button type="button" onClick={addRow} disabled={!available.length}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-40">+ إضافة قطعة</button>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد قطع مضافة (اختياري).</p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={row.itemId} onChange={(e) => setRow(i, { itemId: e.target.value })}
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-blue-600">
                      <option value={row.itemId}>{nameOf(row.itemId)}</option>
                      {available.map((it) => (
                        <option key={it.id} value={it.id}>{it.name} ({it.quantity} {it.unit || ''})</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={row.qty} onChange={(e) => setRow(i, { qty: e.target.value })} dir="ltr"
                      className="w-20 rounded-lg border border-slate-200 px-2.5 py-2 text-sm tabular-nums outline-none focus:border-blue-600" />
                    <button type="button" onClick={() => removeRow(i)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'جارٍ البدء…' : 'بدء المهمة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
