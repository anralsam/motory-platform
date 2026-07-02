'use client';

/**
 * العملاء — owner-side customer intelligence (READ-heavy by design).
 * Customers are registered by the WORKER from his console (name + phone + car);
 * their data flows here automatically. This page enriches every customer with
 * live aggregates derived from the orders stream:
 *   الزيارات (عدد الطلبات) · إجمالي المدفوع (المكتملة) · آخر زيارة · سجل مفصّل.
 * Matching: normalized phone first (waPhone), exact name as fallback.
 */
import { useEffect, useMemo, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { useCustomers } from '@/lib/useCustomers';
import { supabase } from '@/lib/supabaseClient';
import { waPhone } from '@/lib/whatsapp';
import MessageCustomerDrawer from '@/components/MessageCustomerDrawer';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ⃁`;
const STATUS_AR = { pending: 'انتظار', in_progress: 'جاري', ready: 'جاهز', completed: 'مكتمل' };
const STATUS_CLS = {
  pending: 'bg-amber-50 text-amber-600', in_progress: 'bg-blue-50 text-blue-600',
  ready: 'bg-violet-50 text-violet-600', completed: 'bg-emerald-50 text-emerald-600',
};

export default function CustomersPage() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const branchName = selectedId === 'all' ? 'كل الفروع' : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { customers, loading, error } = useCustomers(centerId, selectedId);

  // ── Orders stream (same RLS scope as the home dashboard) — powers the aggregates ──
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!centerId) return;
    let q = supabase.from('orders')
      .select('id, customer_name, customer_phone, service_type, status, price, created_at, branch_id')
      .eq('merchant_id', centerId).order('created_at', { ascending: false }).limit(600);
    if (selectedId && selectedId !== 'all') q = q.eq('branch_id', selectedId);
    q.then(({ data }) => setOrders(data || []));
  }, [centerId, selectedId]);

  // ── Enrich every customer with live aggregates ──
  const enriched = useMemo(() => {
    const byPhone = {};
    const byName = {};
    orders.forEach((o) => {
      const p = waPhone(o.customer_phone);
      if (p) (byPhone[p] = byPhone[p] || []).push(o);
      const n = (o.customer_name || '').trim();
      if (n) (byName[n] = byName[n] || []).push(o);
    });
    return customers.map((c) => {
      const list = byPhone[waPhone(c.phone)] || byName[(c.full_name || '').trim()] || [];
      const spent = list.filter((o) => o.status === 'completed').reduce((s, o) => s + (Number(o.price) || 0), 0);
      const last = list[0]?.created_at || c.created_at;
      return { ...c, ordersList: list, visits: Math.max(list.length, c.total_visits || 0), spent, last };
    });
  }, [customers, orders]);

  const totals = useMemo(() => ({
    count: enriched.length,
    spent: enriched.reduce((s, c) => s + c.spent, 0),
    top: [...enriched].sort((a, b) => b.spent - a.spent)[0] || null,
  }), [enriched]);

  const [search, setSearch] = useState('');
  const [target, setTarget] = useState(null);   // customer for the message drawer
  const [openId, setOpenId] = useState(null);   // expanded history row

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((c) =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.car_model || '').toLowerCase().includes(q)
    );
  }, [enriched, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">العملاء</h1>
          <p className="mt-1 text-sm text-slate-500">{branchName} · يُسجَّل العملاء تلقائياً من جهاز العامل وتظهر بياناتهم هنا مباشرة</p>
        </div>
      </div>

      {/* Aggregate strip */}
      <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3">
        {[
          ['إجمالي العملاء', totals.count.toLocaleString('en-US')],
          ['إجمالي ما دفعوه', sar(totals.spent)],
          ['أعلى عميل إنفاقاً', totals.top ? `${totals.top.full_name || '—'} · ${sar(totals.top.spent)}` : '—'],
        ].map(([l, v], i) => (
          <div key={l} className={`p-5 ${i > 0 ? 'border-slate-200 sm:border-e' : ''}`}>
            <div className="text-xs font-medium text-slate-500">{l}</div>
            <div className="mt-1.5 truncate font-mono text-xl font-bold tabular-nums text-slate-900" dir="ltr">{v}</div>
          </div>
        ))}
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
                <th className="px-5 py-3 text-start">الزيارات</th>
                <th className="px-5 py-3 text-start">إجمالي المدفوع</th>
                <th className="px-5 py-3 text-start">آخر زيارة</th>
                <th className="px-5 py-3 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">{search ? 'لا نتائج مطابقة' : 'لا يوجد عملاء بعد — يضيفهم العامل من لوحته عند تسجيل أول طلب'}</td></tr>
              ) : (
                filtered.map((c) => {
                  const car = [c.car_make, c.car_model].filter(Boolean).join(' ') || '—';
                  const openRow = openId === c.id;
                  return [
                    <tr key={c.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">{(c.full_name || 'ع').charAt(0)}</span>
                          <span className="font-bold text-slate-900">{c.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 ltr text-start">{c.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{car}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-extrabold text-brand">
                          {c.visits.toLocaleString('en')} زيارة
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold tabular-nums text-slate-900" dir="ltr">{sar(c.spent)}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-500">{c.last ? new Date(c.last).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTarget(c)}
                            disabled={!c.phone}
                            title="مراسلة عبر واتساب"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-extrabold text-white transition hover:brightness-105 disabled:opacity-40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
                            مراسلة
                          </button>
                          <button onClick={() => setOpenId(openRow ? null : c.id)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${openRow ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand hover:text-brand'}`}>
                            {openRow ? 'إغلاق' : 'تفاصيل'}
                          </button>
                        </div>
                      </td>
                    </tr>,
                    openRow && (
                      <tr key={c.id + '-detail'} className="bg-slate-50/70">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">سجل الزيارات ({c.ordersList.length})</div>
                          {c.ordersList.length ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {c.ordersList.slice(0, 9).map((o) => (
                                <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900">{o.service_type || 'خدمة'}</div>
                                    <div className="text-[11px] text-slate-400">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-GB') : '—'}</div>
                                  </div>
                                  <div className="flex flex-none flex-col items-end gap-1">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[o.status] || 'bg-slate-100 text-slate-500'}`}>{STATUS_AR[o.status] || o.status}</span>
                                    <span className="font-mono text-xs font-bold tabular-nums text-slate-700" dir="ltr">{sar(o.price)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-slate-400">لا توجد طلبات مسجّلة لهذا العميل بعد.</div>
                          )}
                        </td>
                      </tr>
                    ),
                  ];
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
