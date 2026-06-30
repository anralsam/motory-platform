'use client';
import { useMemo, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { useCustomers } from '@/lib/useCustomers';
import MessageCustomerDrawer from '@/components/MessageCustomerDrawer';

export default function CustomersPage() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const branchName = selectedId === 'all' ? (primary?.name || 'مركزي') : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { customers, loading, error } = useCustomers(centerId, selectedId);

  const [search, setSearch] = useState('');
  const [target, setTarget] = useState(null); // customer for the message drawer

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.car_model || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">العملاء</h1>
          <p className="mt-1 text-sm text-slate-500">{branchName} · {customers.length} عميل</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال أو السيارة..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pe-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">العميل</th>
                <th className="px-5 py-3 text-start">رقم الجوال</th>
                <th className="px-5 py-3 text-start">السيارة</th>
                <th className="px-5 py-3 text-start">إجمالي الزيارات</th>
                <th className="px-5 py-3 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">{search ? 'لا نتائج مطابقة' : 'لا يوجد عملاء في هذا الفرع بعد'}</td></tr>
              ) : (
                filtered.map((c) => {
                  const car = [c.car_make, c.car_model].filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={c.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-violet text-sm font-extrabold text-white">{(c.full_name || 'ع').charAt(0)}</span>
                          <span className="font-bold text-slate-900">{c.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 ltr text-start">{c.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{car}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-extrabold text-brand">
                          {(c.total_visits ?? 0).toLocaleString('en')} زيارة
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setTarget(c)}
                          disabled={!c.phone}
                          title="مراسلة عبر واتساب"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-extrabold text-white transition hover:brightness-105 disabled:opacity-40"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
                          مراسلة
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

      <MessageCustomerDrawer open={!!target} customer={target} centerName={branchName} onClose={() => setTarget(null)} />
    </div>
  );
}
