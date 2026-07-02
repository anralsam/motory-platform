'use client';

/**
 * ServicesManager — merchant pricing engine for service_menu.
 * Add / edit-price / toggle / delete — each wired to a server action that
 * verifies the service belongs to the calling merchant. Optimistic UI.
 * Mobile-friendly (wrapping rows, not a rigid table). VOLD MOTOR light theme.
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { addService, updateServicePrice, toggleService, deleteService } from '@/app/dashboard-pro/actions';

function PriceInput({ s, onSave }) {
  const [v, setV] = useState(String(s.price ?? 0));
  return (
    <div className="flex items-center gap-1">
      <input type="number" min="0" value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (Number(v) !== Number(s.price)) onSave(s.id, v); }} dir="ltr"
        className="w-24 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-blue-600" />
      <span className="text-xs text-slate-400">⃁</span>
    </div>
  );
}

export default function ServicesManager({ initial = [] }) {
  const [items, setItems] = useState(initial);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  async function add() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const r = await addService(name, price, cat);
    setBusy(false);
    if (r?.ok && r.service) { setItems((p) => [...p, r.service]); setName(''); setPrice(''); setCat(''); flash('أُضيفت الخدمة'); }
    else flash(r?.error || 'تعذّرت الإضافة');
  }
  async function savePrice(id, val) {
    const r = await updateServicePrice(id, val);
    if (r?.ok) { setItems((p) => p.map((s) => (s.id === id ? { ...s, price: Number(val) || 0 } : s))); flash('تم تحديث السعر'); }
    else flash(r?.error || 'تعذّر التحديث');
  }
  async function toggle(s) {
    const next = !s.active;
    setItems((p) => p.map((x) => (x.id === s.id ? { ...x, active: next } : x)));
    const r = await toggleService(s.id, next);
    if (!r?.ok) { setItems((p) => p.map((x) => (x.id === s.id ? { ...x, active: s.active } : x))); flash(r?.error || 'تعذّر التغيير'); }
  }
  async function remove(id) {
    const snap = items;
    setItems((p) => p.filter((s) => s.id !== id));
    const r = await deleteService(id);
    if (!r?.ok) { setItems(snap); flash(r?.error || 'تعذّر الحذف'); } else flash('حُذفت الخدمة');
  }

  return (
    <div className="space-y-5">
      {/* Add new service */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-slate-900">إضافة خدمة جديدة</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_1fr_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الخدمة (مثال: غسيل خارجي)"
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" placeholder="السعر" dir="ltr"
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-blue-600" />
          <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="التصنيف (اختياري)"
            className="rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600" />
          <button onClick={add} disabled={busy || !name.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            <Plus size={16} /> إضافة
          </button>
        </div>
      </div>

      {/* Services list */}
      {items.length ? (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {items.map((s) => (
            <div key={s.id} className={`flex flex-wrap items-center gap-3 p-4 ${s.active ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                <div className="text-xs text-slate-400">{s.category || 'عام'}</div>
              </div>
              <PriceInput s={s} onSave={savePrice} />
              <button onClick={() => toggle(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${s.active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {s.active ? 'مفعّلة' : 'معطّلة'}
              </button>
              <button onClick={() => remove(s.id)} title="حذف" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-rose-500 transition hover:bg-rose-50"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-400">لا توجد خدمات بعد — أضف أول خدمة بالأعلى.</div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-6">{toast}</div>
      )}
    </div>
  );
}
