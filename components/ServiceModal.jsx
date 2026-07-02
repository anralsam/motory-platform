'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { categoriesFor } from '@/lib/centerTypes';

/**
 * Add / edit a service. onSaved() → parent refetch. Stamps branch_id on insert.
 */
export default function ServiceModal({ open, onClose, onSaved, centerId, branchId, centerType, editing }) {
  const cats = categoriesFor(centerType);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(cats[0]?.label || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) { setName(editing.name || ''); setPrice(String(editing.price ?? '')); setCategory(editing.category || cats[0]?.label || ''); }
    else { setName(''); setPrice(''); setCategory(cats[0]?.label || ''); }
    setError(''); setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  if (!open) return null;

  async function save() {
    setError('');
    if (!name.trim()) { setError('اسم الخدمة مطلوب'); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { setError('أدخل سعراً صحيحاً'); return; }
    setSaving(true);
    let res;
    if (editing) {
      res = await supabase.from('service_menu').update({ name: name.trim(), price: p, category }).eq('id', editing.id);
    } else {
      res = await supabase.from('service_menu').insert({
        merchant_id: centerId, name: name.trim(), price: p, category,
        branch_id: branchId && branchId !== 'all' ? branchId : null,
      });
    }
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved?.();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">{editing ? 'تعديل خدمة' : 'إضافة خدمة'}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

        <div className="space-y-4">
          <Field label="اسم الخدمة">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تغيير زيت 5W-30" className={inp} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر (⃀)">
              <input type="number" min="0" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inp} />
            </Field>
            <Field label="الفئة">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                {cats.map((c) => <option key={c.key} value={c.label}>{c.label}</option>)}
                {category && !cats.some((c) => c.label === category) && <option value={category}>{category}</option>}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">
            {saving && <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';
function Field({ label, children }) {
  return (<label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-slate-600">{label}</span>{children}</label>);
}
