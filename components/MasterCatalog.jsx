'use client';

/**
 * MasterCatalog — "الكشّة الثابتة" master template cache for service activities.
 * A categorized view over service_menu: each activity (oil change, car wash, …) is a
 * section of fixed template entries with locked pricing (SAR) and — for parts-bearing
 * activities like oil — a stock code. Borderless line CRUD with localized optimistic
 * state. These templates flow down to the technician's order/quick-deduct interface.
 * YouTube-Studio tokens: bg-white · border-slate-200 · rounded-2xl · p-8 · RTL.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Droplet, Sparkles, Tag } from 'lucide-react';
import { useServices } from '@/lib/useServices';
import { addService, updateServicePrice, updateServiceStockCode, deleteService } from '@/app/dashboard-pro/actions';

const ACTIVITIES = [
  { key: 'تغيير الزيوت', label: 'نشاط تغيير الزيوت', hint: 'علامات الزيوت بأسعارها الثابتة وأكوادها المخزنية', Icon: Droplet, withStock: true, addLabel: 'إضافة علامة زيت', ph: 'مثال: Shell HX7' },
  { key: 'غسيل السيارات', label: 'نشاط غسيل السيارات', hint: 'فئات الغسيل بأسعار ثابتة', Icon: Sparkles, withStock: false, addLabel: 'إضافة فئة غسيل', ph: 'مثال: غسيل بخار' },
];

export default function MasterCatalog({ centerId, branchId, showToast }) {
  const { services, loading, refetch } = useServices(centerId, branchId);
  const [items, setItems] = useState([]);
  const tmp = useRef(0);

  useEffect(() => { setItems(services); }, [services]);

  // Known activities + any other categories already present in the data.
  const sections = useMemo(() => {
    const known = new Set(ACTIVITIES.map((a) => a.key));
    const extras = [...new Set(items.map((i) => i.category).filter((c) => c && !known.has(c)))]
      .map((c) => ({ key: c, label: c, hint: 'قائمة قوالب ثابتة', Icon: Tag, withStock: false, addLabel: 'إضافة صنف قالب', ph: 'اسم الصنف' }));
    return [...ACTIVITIES, ...extras];
  }, [items]);

  async function addItem(section, name, price, stock) {
    if (!name.trim()) return;
    const id = `tmp-${(tmp.current += 1)}`;
    const temp = { id, name: name.trim(), price: Number(price) || 0, category: section.key, stock_code: stock?.trim() || null, active: true };
    setItems((p) => [...p, temp]);
    const r = await addService(temp.name, temp.price, section.key, temp.stock_code);
    if (r?.ok && r.service) setItems((p) => p.map((x) => (x.id === id ? r.service : x)));
    else { setItems((p) => p.filter((x) => x.id !== id)); showToast?.(r?.error || 'تعذّرت الإضافة', 'error'); }
  }

  async function savePrice(item, price) {
    const val = Number(price) || 0;
    if (val === Number(item.price)) return;
    const prev = items;
    setItems((p) => p.map((x) => (x.id === item.id ? { ...x, price: val } : x)));
    const r = await updateServicePrice(item.id, val);
    if (!r?.ok) { setItems(prev); showToast?.(r?.error || 'تعذّر حفظ السعر', 'error'); }
  }

  async function saveStock(item, code) {
    const val = code?.trim() || null;
    if (val === (item.stock_code || null)) return;
    const prev = items;
    setItems((p) => p.map((x) => (x.id === item.id ? { ...x, stock_code: val } : x)));
    const r = await updateServiceStockCode(item.id, val);
    if (!r?.ok) { setItems(prev); showToast?.(r?.error || 'تعذّر حفظ الكود', 'error'); }
  }

  async function removeItem(item) {
    const prev = items;
    setItems((p) => p.filter((x) => x.id !== item.id));
    const r = await deleteService(item.id);
    if (!r?.ok) { setItems(prev); showToast?.(r?.error || 'تعذّر الحذف', 'error'); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">إدارة قوالب الأنشطة والخدمات الثابتة</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">كشّة ثابتة موحّدة تتدفّق مباشرةً إلى واجهات الفنّيين — تمنع تباين الأسعار والكتابة اليدوية.</p>
      </div>

      {sections.map((s) => (
        <CategorySection key={s.key} section={s} items={items.filter((i) => i.category === s.key)} loading={loading}
          onAdd={addItem} onPrice={savePrice} onStock={saveStock} onRemove={removeItem} />
      ))}
    </div>
  );
}

function CategorySection({ section, items, loading, onAdd, onPrice, onStock, onRemove }) {
  const { Icon } = section;
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  function submit() {
    onAdd(section, name, price, stock);
    setName(''); setPrice(''); setStock('');
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={18} /></span>
        <div>
          <div className="text-base font-bold tracking-tight text-slate-900">{section.label}</div>
          <div className="text-xs font-medium text-slate-500">{section.hint}</div>
        </div>
      </div>

      {/* Add row */}
      <div className={`grid gap-3 ${section.withStock ? 'sm:grid-cols-[1fr_120px_140px_auto]' : 'sm:grid-cols-[1fr_120px_auto]'}`}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={section.ph}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white" />
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:bg-white">
          <input value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} inputMode="decimal" placeholder="0"
            className="w-full bg-transparent py-2.5 text-sm tabular-nums outline-none" dir="ltr" />
          <span className="text-xs font-semibold text-slate-400">⃀</span>
        </div>
        {section.withStock && (
          <input value={stock} onChange={(e) => setStock(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="كود المخزون"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white" dir="ltr" />
        )}
        <button onClick={submit} disabled={!name.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50">
          <Plus size={15} strokeWidth={2.5} /> {section.addLabel}
        </button>
      </div>

      {/* Template list */}
      <div className="mt-6 divide-y divide-slate-100">
        {loading && !items.length ? (
          <div className="py-6 text-center text-sm text-slate-400">جاري التحميل…</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">لا توجد قوالب بعد — أضف أول صنف بالأعلى.</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{it.name}</span>
              {section.withStock && (
                <input defaultValue={it.stock_code || ''} onBlur={(e) => onStock(it, e.target.value)} placeholder="كود"
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs tabular-nums outline-none transition-colors focus:border-blue-400 focus:bg-white" dir="ltr" />
              )}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 focus-within:border-blue-400 focus-within:bg-white">
                <input defaultValue={Number(it.price)} onBlur={(e) => onPrice(it, e.target.value)} inputMode="decimal"
                  className="w-16 bg-transparent py-1.5 text-sm font-semibold tabular-nums outline-none" dir="ltr" />
                <span className="text-[11px] font-semibold text-slate-400">⃀</span>
              </div>
              <button onClick={() => onRemove(it)} aria-label="حذف"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500">
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
