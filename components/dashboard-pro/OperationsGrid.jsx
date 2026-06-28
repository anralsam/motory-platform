'use client';

/**
 * OperationsGrid — responsive operations data grid (System Token).
 *   • Desktop: wide, airy rows (no zebra striping) — just hover:bg-slate-50.
 *     Edit/Audit actions stay hidden, revealed on row hover.
 *   • Mobile: collapses into a Card Stack; each row becomes a card with a
 *     kebab dropdown for the actions.
 *   • Pill-shaped status badges (StatusPill). rounded-xl surfaces, slate-200.
 */
import { useState } from 'react';
import { Pencil, ScrollText, MoreVertical } from 'lucide-react';
import StatusPill from './StatusPill';
import NoData from './NoData';

const shortId = (id) => `#${String(id).slice(0, 8)}`;

export default function OperationsGrid({ orders = [] }) {
  const [menuId, setMenuId] = useState(null);
  const [toast, setToast] = useState(null);

  function act(type, o) {
    setMenuId(null);
    setToast(`${type === 'edit' ? 'تعديل' : 'تدقيق'} الطلب ${shortId(o.id)}`);
    setTimeout(() => setToast(null), 2200);
  }

  if (!orders.length) return <NoData title="لا توجد عمليات" hint="لا توجد طلبات لعرضها في السجلّ." />;

  return (
    <div>
      {/* ══ Desktop data grid ══ */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="grid grid-cols-[120px_1.3fr_1fr_1fr_auto_120px] items-center gap-4 border-b border-slate-200 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span dir="ltr">الطلب</span><span>العميل</span><span>الورشة</span><span>الفنّي</span><span>الحالة</span><span className="text-end">إجراءات</span>
        </div>
        <div className="divide-y divide-slate-100">
          {orders.map((o) => (
            <div key={o.id} className="group grid grid-cols-[120px_1.3fr_1fr_1fr_auto_120px] items-center gap-4 px-6 py-5 transition-colors duration-300 hover:bg-slate-50">
              <span className="font-inter text-xs font-semibold text-slate-400" dir="ltr">{shortId(o.id)}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{o.customer_name || 'عميل'}</div>
                <div className="truncate text-xs text-slate-400">{[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}{o.plate ? <span dir="ltr"> · {o.plate}</span> : null}</div>
              </div>
              <span className="truncate text-sm text-slate-600">{o.branchName}</span>
              <span className="truncate text-sm text-slate-600">{o.techName}</span>
              <StatusPill status={o.status} />
              <div className="flex justify-end gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <button onClick={() => act('audit', o)} title="تدقيق" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-all duration-300 hover:scale-105 hover:border-blue-600 hover:text-blue-600"><ScrollText size={15} /></button>
                <button onClick={() => act('edit', o)} title="تعديل" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-all duration-300 hover:scale-105 hover:border-blue-600 hover:text-blue-600"><Pencil size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Mobile card stack ══ */}
      <div className="space-y-3 lg:hidden">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-inter text-xs font-semibold text-slate-400" dir="ltr">{shortId(o.id)}</span>
              <div className="flex items-center gap-2">
                <StatusPill status={o.status} />
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === o.id ? null : o.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"><MoreVertical size={16} /></button>
                  {menuId === o.id && (
                    <div className="absolute end-0 z-10 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button onClick={() => act('audit', o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm text-slate-700 hover:bg-slate-50"><ScrollText size={15} /> تدقيق</button>
                      <button onClick={() => act('edit', o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm text-slate-700 hover:bg-slate-50"><Pencil size={15} /> تعديل</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">{o.customer_name || 'عميل'}</div>
            <div className="text-xs text-slate-400">{[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}{o.plate ? <span dir="ltr"> · {o.plate}</span> : null}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-md bg-slate-50 px-2 py-1">{o.branchName}</span>
              <span className="rounded-md bg-slate-50 px-2 py-1">{o.techName}</span>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-6">{toast}</div>
      )}
    </div>
  );
}
