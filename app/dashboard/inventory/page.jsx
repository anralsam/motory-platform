'use client';
import { useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { useInventory } from '@/lib/useInventory';
import { categoriesFor, catLabelOf } from '@/lib/centerTypes';
import { supabase } from '@/lib/supabaseClient';
import AddInventoryModal from '@/components/AddInventoryModal';
import Toast from '@/components/Toast';

function statusOf(item) {
  if (item.qty === 0) return { key: 'out', label: 'نفد', cls: 'bg-red-50 text-red-700 ring-red-600/20' };
  if (item.qty < item.min) return { key: 'low', label: 'منخفض', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' };
  return { key: 'ok', label: 'متوفر', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' };
}

export default function InventoryPage() {
  const { t } = useT();
  const { user } = useAuth();
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);

  // Resolve the active center type: a specific branch's type, or the primary's when "all".
  const centerType = useMemo(() => {
    if (selectedId !== 'all') {
      const b = branches.find((x) => x.id === selectedId);
      return b?.center_type || 'أخرى';
    }
    const prim = branches.find((x) => x.is_primary) || branches[0];
    return prim?.center_type || 'أخرى';
  }, [selectedId, branches]);

  const { items, loading, error, refetch, patchItem } = useInventory(user?.id, selectedId);

  // القواعد الثابتة: فئات النشاط الأساسية + أي تصنيفات رئيسية أضافها المالك بنفسه.
  const baseCategories = useMemo(() => categoriesFor(centerType), [centerType]);
  const categories = useMemo(() => {
    const known = new Set(baseCategories.map((c) => c.key));
    const palette = ['#0f766e', '#b45309', '#6d28d9', '#be123c', '#0369a1'];
    const customs = [...new Set(items.map((i) => i.cat).filter((c) => c && !known.has(c)))]
      .map((c, i) => ({ key: c, label: catLabelOf(c), color: palette[i % palette.length], custom: true }));
    return [...baseCategories, ...customs];
  }, [baseCategories, items]);
  const catColor = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c.color])), [categories]);


  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // ── Premium toast ──
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const toastTimer = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }

  // reset category filter if it no longer exists for this type
  const activeCat = categories.some((c) => c.key === cat) ? cat : 'all';

  // ── Inline direct QUANTITY editing — replaces the removed «حركة» button.
  //     Click the qty → edit → save: updates the row AND logs the movement
  //     (in/out derived from the delta) so the audit trail stays intact. ──
  const [qtyEdit, setQtyEdit] = useState(null); // { id, value }
  async function saveQty() {
    const e = qtyEdit;
    if (!e) return;
    const val = Math.max(0, parseInt(e.value) || 0);
    setQtyEdit(null);
    const item = items.find((i) => i.id === e.id);
    if (!item || item.qty === val) return;
    const prev = item.qty;
    patchItem(e.id, { qty: val });
    const branch_id = selectedId && selectedId !== 'all' ? selectedId : null;
    const delta = val - prev;
    const { error: mvErr } = await supabase.from('inventory_movements').insert({
      merchant_id: user.id, item_id: item.id, type: delta >= 0 ? 'in' : 'out', quantity: Math.abs(delta), notes: 'تعديل مباشر', branch_id,
    });
    const { error: upErr } = mvErr ? { error: mvErr }
      : await supabase.from('inventory').update({ quantity: val, updated_at: new Date().toISOString() }).eq('id', e.id);
    if (mvErr || upErr) { patchItem(e.id, { qty: prev }); showToast('تعذّر حفظ الكمية', 'error'); }
    else showToast(`كمية «${item.name}» صارت ${val.toLocaleString('en')} ${item.unit}`);
  }

  // ── Inline direct pricing: click the price → edit → persists to sell_price,
  //     and flows straight into future worker operations (same inventory table). ──
  const [priceEdit, setPriceEdit] = useState(null); // { id, value }
  async function savePrice() {
    const e = priceEdit;
    if (!e) return;
    const val = Math.max(0, Number(e.value) || 0);
    setPriceEdit(null);
    const item = items.find((i) => i.id === e.id);
    if (!item || item.price === val) return;
    const prev = item.price;
    patchItem(e.id, { price: val });                       // optimistic
    const { error: err } = await supabase.from('inventory')
      .update({ sell_price: val, updated_at: new Date().toISOString() }).eq('id', e.id);
    if (err) { patchItem(e.id, { price: prev }); showToast('تعذّر حفظ السعر', 'error'); }
    else showToast(`سعر «${item.name}» صار ${val.toLocaleString('en')} ⃁`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchCat = activeCat === 'all' || i.cat === activeCat;
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, activeCat, search]);

  // ── Organized view: rows grouped under category headers, in the activity's
  //     canonical category order (unknown categories sink to the bottom). ──
  const grouped = useMemo(() => {
    const order = Object.fromEntries(categories.map((c, i) => [c.key, i]));
    const sorted = [...filtered].sort((a, b) =>
      ((order[a.cat] ?? 99) - (order[b.cat] ?? 99)) || a.name.localeCompare(b.name, 'ar'));
    const groups = [];
    sorted.forEach((i) => {
      const last = groups[groups.length - 1];
      if (!last || last.cat !== i.cat) groups.push({ cat: i.cat, items: [i] });
      else last.items.push(i);
    });
    return groups;
  }, [filtered, categories]);

  const lowStock = useMemo(() => items.filter((i) => i.qty <= i.min), [items]);

  const counts = useMemo(() => {
    const m = {};
    items.forEach((i) => { m[i.cat] = (m[i.cat] || 0) + 1; });
    return m;
  }, [items]);

  const branchName = selectedId === 'all' ? 'كل الفروع' : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('المخزون')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {branchName} · {t('نوع النشاط:', 'Activity type:')} <span className="font-bold text-slate-700">{centerType}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {t('أضف تصنيفاتك وأصنافك بأسعار ثابتة مرة واحدة، ثم عدّل الكمية أو السعر بالنقر عليهما مباشرة', 'Add your categories and items with fixed prices once, then edit quantity or price by tapping them')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            {t('إضافة صنف', 'Add item')}
          </button>
        </div>
      </div>

      {/* Context-aware category tabs */}
      <div className="flex flex-wrap gap-2">
        <Chip active={activeCat === 'all'} onClick={() => setCat('all')}>
          الكل <span className="opacity-60">({items.length})</span>
        </Chip>
        {categories.map((c) => (
          <Chip key={c.key} active={activeCat === c.key} onClick={() => setCat(c.key)}>
            {c.label} <span className="opacity-60">({counts[c.key] || 0})</span>
          </Chip>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('ابحث باسم الصنف أو المورّد...', 'Search by item or supplier...')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pe-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      {/* Low-stock alert strip */}
      {!loading && lowStock.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg className="text-amber-600" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
          <span className="text-sm font-extrabold text-amber-800">{lowStock.length} {t('صنف يحتاج إعادة تعبئة:', 'items need restocking:')}</span>
          <span className="text-sm font-semibold text-amber-700">{lowStock.slice(0, 4).map((i) => i.name).join('، ')}{lowStock.length > 4 ? ` +${lowStock.length - 4} أخرى` : ''}</span>
        </div>
      )}

      {/* Data table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">{t('الصنف', 'Item')}</th>
                <th className="px-5 py-3 text-start">{t('الفئة', 'Category')}</th>
                <th className="px-5 py-3 text-start">{t('الكمية', 'Quantity')}</th>
                <th className="px-5 py-3 text-start">{t('سعر الوحدة', 'Unit price')}</th>
                <th className="px-5 py-3 text-start">{t('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="text-sm font-bold text-slate-700">{search || activeCat !== 'all' ? 'لا نتائج مطابقة' : 'لا يوجد مخزون لهذا الفرع بعد'}</div>
                    {!search && activeCat === 'all' && (
                      <button onClick={() => setModalOpen(true)} className="mt-3 text-sm font-extrabold text-brand">+ إضافة أول صنف</button>
                    )}
                  </td>
                </tr>
              ) : (
                grouped.flatMap((g) => {
                  const gcol = catColor[g.cat] || '#57606a';
                  return [
                    <tr key={'h-' + g.cat} className="bg-slate-50/80">
                      <td colSpan={5} className="px-5 py-2">
                        <span className="inline-flex items-center gap-2 text-xs font-extrabold" style={{ color: gcol }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: gcol }} />
                          {catLabelOf(g.cat)}
                          <span className="font-bold text-slate-400">· {g.items.length} صنف</span>
                        </span>
                      </td>
                    </tr>,
                    ...g.items.map((i) => {
                  const st = statusOf(i);
                  const col = catColor[i.cat] || '#57606a';
                  const low = st.key !== 'ok';
                  return (
                    <tr key={i.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="font-bold text-slate-900">{i.name}</div>
                          {i.supplier && <div className="text-xs text-slate-400">{i.supplier}</div>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: col + '18', color: col }}>{catLabelOf(i.cat)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {qtyEdit?.id === i.id ? (
                          <input autoFocus type="number" min="0" value={qtyEdit.value}
                            onChange={(e) => setQtyEdit({ id: i.id, value: e.target.value })}
                            onBlur={saveQty}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveQty(); if (e.key === 'Escape') setQtyEdit(null); }}
                            className="w-20 rounded-lg border border-slate-900 bg-white px-2 py-1 text-sm font-bold text-slate-900 outline-none" dir="ltr" />
                        ) : (
                          <button onClick={() => setQtyEdit({ id: i.id, value: i.qty })} title="اضغط لتعديل الكمية"
                            className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-slate-50">
                            <span className={`font-extrabold ${low ? 'text-red-600' : 'text-slate-900'}`}>{i.qty.toLocaleString('en')}</span>
                            <span className="text-xs text-slate-400">{i.unit}</span>
                            {low && <span className="text-[11px] font-bold text-red-500">(الحد {i.min})</span>}
                            <svg className="text-slate-300 opacity-0 transition group-hover:opacity-100" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {priceEdit?.id === i.id ? (
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            value={priceEdit.value}
                            onChange={(e) => setPriceEdit({ id: i.id, value: e.target.value })}
                            onBlur={savePrice}
                            onKeyDown={(e) => { if (e.key === 'Enter') savePrice(); if (e.key === 'Escape') setPriceEdit(null); }}
                            className="w-24 rounded-lg border border-brand bg-white px-2 py-1 text-sm font-bold text-slate-900 outline-none ring-2 ring-brand/15"
                            dir="ltr"
                          />
                        ) : (
                          <button
                            onClick={() => setPriceEdit({ id: i.id, value: i.price })}
                            title="اضغط للتسعير المباشر"
                            className="group inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-bold text-slate-700 transition hover:bg-brand/5 hover:text-brand"
                          >
                            {i.price.toLocaleString('en')} ⃁
                            <svg className="opacity-0 transition group-hover:opacity-100" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                }),
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddInventoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
        categories={categories}
        userId={user?.id}
        branchId={selectedId}
        centerType={centerType}
      />

      <Toast toast={toast} />
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
