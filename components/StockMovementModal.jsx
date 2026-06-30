'use client';
import { useEffect, useState } from 'react';

/**
 * Stock movement modal — adjust an item's quantity (add shipment / consume).
 * Collects { type, qty, note } and delegates the mutation to `onSubmit` (so the
 * parent can do the optimistic update + DB write + toast). Returns nothing; the
 * parent closes it on success.
 */
export default function StockMovementModal({ open, item, onClose, onSubmit }) {
  const [type, setType] = useState('in'); // 'in' = add, 'out' = deduct
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setType('in'); setQty(''); setNote(''); setError(''); setSaving(false); }
  }, [open, item]);

  if (!open || !item) return null;

  const n = parseInt(qty) || 0;
  const projected = type === 'in' ? item.qty + n : Math.max(0, item.qty - n);

  async function submit() {
    setError('');
    if (!n || n < 1) { setError('أدخل كمية صحيحة (1 أو أكثر).'); return; }
    if (type === 'out' && n > item.qty) { setError('الكمية المسحوبة تتجاوز المتوفر.'); return; }
    setSaving(true);
    const res = await onSubmit({ type, qty: n, note: note.trim() });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">تسجيل حركة مخزون</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          {item.name} — المتوفر حالياً: <span className="font-extrabold text-gray-800">{item.qty} {item.unit}</span>
        </p>

        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

        {/* Movement type toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('in')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-extrabold transition ${
              type === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-gray-500 hover:border-slate-200'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            إضافة للمخزون
          </button>
          <button
            type="button"
            onClick={() => setType('out')}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-extrabold transition ${
              type === 'out' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-gray-500 hover:border-slate-200'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14" /></svg>
            سحب من المخزون
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-600">الكمية</span>
            <input
              type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1"
              className="w-full rounded-xl border border-slate-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-gray-600">السبب / الملاحظة</span>
            <input
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: استُخدم في الطلب رقم 124، أو وصول شحنة جديدة"
              className="w-full rounded-xl border border-slate-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
            />
          </label>

          {n > 0 && (
            <div className="rounded-xl bg-gray-50 px-3.5 py-3 text-sm font-bold text-gray-600">
              الكمية بعد الحركة: <span className={`font-extrabold ${type === 'out' && projected < item.min ? 'text-red-600' : 'text-gray-900'}`}>{projected} {item.unit}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
          <button
            onClick={submit} disabled={saving}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-70 ${type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {saving && (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
            )}
            تسجيل الحركة
          </button>
        </div>
      </div>
    </div>
  );
}
