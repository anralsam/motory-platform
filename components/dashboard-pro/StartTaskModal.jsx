'use client';

/**
 * StartTaskModal — the Action Modal for a task (plate + service + parts).
 * Opens with a smooth framer-motion entrance. Parts use a TYPE-AHEAD search over
 * the center's inventory (type "فلتر" → suggests matching items). Submits via the
 * startOrderWithParts Server Action (validates stock + auth server-side).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { startOrderWithParts } from '@/app/dashboard-pro/actions';

export default function StartTaskModal({ order, inventory = [], onClose, onStarted }) {
  const [plate, setPlate] = useState(order?.plate || '');
  const [serviceType, setServiceType] = useState(order?.service_type || '');
  const [rows, setRows] = useState([]); // { itemId, qty }
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chosen = new Set(rows.map((r) => r.itemId));
  const suggestions = query.trim()
    ? inventory.filter((i) => !chosen.has(i.id) && i.name?.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  function addPart(item) {
    setRows((r) => [...r, { itemId: item.id, qty: 1 }]);
    setQuery('');
  }
  const setQty = (i, qty) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, qty } : row)));
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const itemOf = (id) => inventory.find((x) => x.id === id);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!plate.trim() || !serviceType.trim()) { setError('اللوحة ونوع الخدمة مطلوبان'); return; }
    setBusy(true);
    const res = await startOrderWithParts(order.id, {
      plate: plate.trim(), serviceType: serviceType.trim(),
      parts: rows.map((r) => ({ itemId: r.itemId, qty: Number(r.qty) })),
    });
    setBusy(false);
    if (res?.ok) { onStarted?.(order.id); onClose?.(); }
    else setError(res?.error || 'تعذّر بدء المهمة');
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-md sm:items-center sm:p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-t-2xl border border-slate-200 bg-white p-7 shadow-xl sm:rounded-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }} onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">بدء المهمة — {order?.customer_name || 'عميل'}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">رقم اللوحة *</label>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" placeholder="ABC-1234"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">نوع الخدمة *</label>
              <input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="تغيير زيت"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
            </div>
          </div>

          {/* Type-ahead parts search */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">القطع المستخدمة (تُخصم من المخزون)</label>
            <div className="relative">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قطعة… مثل: فلتر"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
              {suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
                  {suggestions.map((it) => (
                    <button type="button" key={it.id} onClick={() => addPart(it)}
                      className="flex w-full items-center justify-between px-3 py-2 text-start text-sm hover:bg-slate-50">
                      <span className="font-medium text-slate-700">{it.name}</span>
                      <span className="text-xs tabular-nums text-slate-400" dir="ltr">{it.quantity} {it.unit || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className="mt-2 space-y-2">
                {rows.map((row, i) => {
                  const it = itemOf(row.itemId);
                  return (
                    <div key={row.itemId} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex-1 text-sm font-medium text-slate-700">{it?.name || 'قطعة'}</span>
                      <span className="text-[11px] tabular-nums text-slate-400" dir="ltr">متاح {it?.quantity ?? '—'}</span>
                      <input type="number" min="1" value={row.qty} onChange={(e) => setQty(i, e.target.value)} dir="ltr"
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-blue-600" />
                      <button type="button" onClick={() => removeRow(i)} className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{error}</p> : null}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">إلغاء</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'جارٍ البدء…' : 'بدء المهمة'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
