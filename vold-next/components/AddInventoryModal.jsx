'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Clean add-item modal. Category options come from the active branch's center type,
 * and the new row is stamped with the active branch_id (null → DB trigger assigns primary).
 */
export default function AddInventoryModal({ open, onClose, onSaved, categories, userId, branchId, centerType }) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState(categories[0]?.key || 'general');
  const [qty, setQty] = useState('');
  const [min, setMin] = useState('');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(''); setCat(categories[0]?.key || 'general'); setQty(''); setMin(''); setPrice(''); setSupplier(''); setError('');
    }
  }, [open, categories]);

  if (!open) return null;

  async function save() {
    setError('');
    if (!name.trim()) { setError('الرجاء إدخال اسم الصنف'); return; }
    if (!userId) { setError('لا توجد جلسة مستخدم'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('inventory').insert({
      merchant_id: userId,
      name: name.trim(),
      category: cat,
      quantity: parseInt(qty) || 0,
      min_quantity: parseInt(min) || 5,
      sell_price: parseFloat(price) || 0,
      supplier: supplier.trim() || null,
      branch_id: branchId && branchId !== 'all' ? branchId : null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved?.();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">إضافة صنف جديد</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">يُضاف للفرع الحالي ({centerType || 'عام'}).</p>

        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="اسم الصنف" className="col-span-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: كرتون زيت 5W-30" className={inputCls} />
          </Field>
          <Field label="الفئة">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="المورّد (اختياري)">
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="اسم المورّد" className={inputCls} />
          </Field>
          <Field label="الكمية">
            <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
          <Field label="الحد الأدنى للتنبيه">
            <input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} placeholder="5" className={inputCls} />
          </Field>
          <Field label="سعر الوحدة (ر.س)" className="col-span-2">
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className={inputCls} />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">
            {saving && <Spinner />}
            حفظ الصنف
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';

function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold text-gray-600">{label}</span>
      {children}
    </label>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
