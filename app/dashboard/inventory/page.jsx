'use client';
import { useMemo, useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { useInventory } from '@/lib/useInventory';
import { categoriesFor, catLabelOf } from '@/lib/centerTypes';
import { supabase } from '@/lib/supabaseClient';
import AddInventoryModal from '@/components/AddInventoryModal';
import StockMovementModal from '@/components/StockMovementModal';
import Toast from '@/components/Toast';

function statusOf(item) {
  if (item.qty === 0) return { key: 'out', label: 'نفد', cls: 'bg-red-50 text-red-700 ring-red-600/20' };
  if (item.qty < item.min) return { key: 'low', label: 'منخفض', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' };
  return { key: 'ok', label: 'متوفر', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' };
}

export default function InventoryPage() {
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

  const categories = useMemo(() => categoriesFor(centerType), [centerType]);
  const catColor = useMemo(() => Object.fromEntries(categories.map((c) => [c.key, c.color])), [categories]);

  const { items, loading, error, refetch, patchItem } = useInventory(user?.id, selectedId);

  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [movementItem, setMovementItem] = useState(null);

  // ── Premium toast ──
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const toastTimer = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }

  // ── Stock movement: optimistic update + DB write, rollback on failure ──
  async function handleMovement({ type, qty, note }) {
    const item = movementItem;
    if (!item) return { error: 'لا يوجد صنف' };
    const prevQty = item.qty;
    const newQty = type === 'in' ? prevQty + qty : Math.max(0, prevQty - qty);

    // 1) optimistic UI — reflect instantly
    patchItem(item.id, { qty: newQty });

    // 2) persist: log the movement + update the item quantity
    const branch_id = selectedId && selectedId !== 'all' ? selectedId : null;
    const { error: mvErr } = await supabase.from('inventory_movements').insert({
      merchant_id: user.id, item_id: item.id, type, quantity: qty, notes: note || null, branch_id,
    });
    const { error: upErr } = mvErr
      ? { error: mvErr }
      : await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', item.id);

    if (mvErr || upErr) {
      patchItem(item.id, { qty: prevQty }); // rollback
      showToast('تعذّر تسجيل الحركة', 'error');
      return { error: (mvErr || upErr).message };
    }

    showToast(type === 'in' ? `تمت إضافة ${qty} ${item.unit}` : `تم سحب ${qty} ${item.unit}`, 'success');
    return {};
  }

  // reset category filter if it no longer exists for this type
  const activeCat = categories.some((c) => c.key === cat) ? cat : 'all';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchCat = activeCat === 'all' || i.cat === activeCat;
      const matchSearch = !q || i.name.toLowerCase().includes(q) || (i.supplier || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [items, activeCat, search]);

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
          <h1 className="text-2xl font-extrabold text-gray-900">المخزون</h1>
          <p className="mt-1 text-sm text-gray-500">
            {branchName} · نوع النشاط: <span className="font-bold text-gray-700">{centerType}</span>
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          إضافة صنف
        </button>
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
        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الصنف أو المورّد..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pe-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-gray-50 text-xs font-bold text-gray-500">
                <th className="px-5 py-3 text-start">الصنف</th>
                <th className="px-5 py-3 text-start">الفئة</th>
                <th className="px-5 py-3 text-start">الكمية</th>
                <th className="px-5 py-3 text-start">سعر الوحدة</th>
                <th className="px-5 py-3 text-start">الحالة</th>
                <th className="px-5 py-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="text-sm font-bold text-gray-700">{search || activeCat !== 'all' ? 'لا نتائج مطابقة' : 'لا يوجد مخزون لهذا الفرع بعد'}</div>
                    {!search && activeCat === 'all' && (
                      <button onClick={() => setModalOpen(true)} className="mt-3 text-sm font-extrabold text-brand">+ إضافة أول صنف</button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const st = statusOf(i);
                  const col = catColor[i.cat] || '#57606a';
                  const low = st.key !== 'ok';
                  return (
                    <tr key={i.id} className="text-sm transition hover:bg-gray-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: col + '1a' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                          </span>
                          <div>
                            <div className="font-bold text-gray-900">{i.name}</div>
                            {i.supplier && <div className="text-xs text-gray-400">{i.supplier}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ background: col + '18', color: col }}>{catLabelOf(i.cat)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-extrabold ${low ? 'text-red-600' : 'text-gray-900'}`}>{i.qty.toLocaleString('en')}</span>
                        <span className="text-xs text-gray-400"> {i.unit}</span>
                        {low && <span className="ms-1 text-[11px] font-bold text-red-500">(الحد {i.min})</span>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-gray-700">{i.price.toLocaleString('en')} ر.س</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setMovementItem(i)}
                          title="تسجيل حركة مخزون"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-gray-600 transition hover:border-brand hover:text-brand"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7H3m0 0 3-3M3 7l3 3M16 17h5m0 0-3 3m3-3-3-3" /></svg>
                          حركة
                        </button>
                      </td>
                    </tr>
                  );
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

      <StockMovementModal
        open={!!movementItem}
        item={movementItem}
        onClose={() => setMovementItem(null)}
        onSubmit={handleMovement}
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
        active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-gray-500 hover:border-brand hover:text-brand'
      }`}
    >
      {children}
    </button>
  );
}
