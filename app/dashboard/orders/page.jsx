'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { useRecentOrders } from '@/lib/useOrders';
import { META } from '@/lib/orderFlow';
import { supabase } from '@/lib/supabaseClient';
import CreateOrderModal from '@/components/CreateOrderModal';
import Toast from '@/components/Toast';

const STATUS_TINT = {
  pending: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  ready: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-50 text-emerald-700',
};

function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return '—'; } }

export default function OrdersPage() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);

  // Resolve effective ids for creation/scoping.
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const effBranchId = selectedId !== 'all' ? selectedId : (primary?.id || null);
  const centerType = useMemo(() => {
    if (selectedId !== 'all') return branches.find((b) => b.id === selectedId)?.center_type || 'أخرى';
    return primary?.center_type || 'أخرى';
  }, [selectedId, branches, primary]);
  const branchName = selectedId === 'all' ? (primary?.name || 'الفرع الرئيسي') : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { orders, loading, error, refetch } = useRecentOrders(centerId, selectedId);

  // Resolve assigned_to (user_id) → technician name for the table.
  const [workerMap, setWorkerMap] = useState({});
  useEffect(() => {
    if (!centerId) return;
    supabase.from('workers').select('user_id,full_name,phone').eq('center_id', centerId).then(({ data }) => {
      const m = {};
      (data || []).forEach((w) => { if (w.user_id) m[w.user_id] = w.full_name || w.phone || 'فني'; });
      setWorkerMap(m);
    });
  }, [centerId]);

  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">الطلبات</h1>
          <p className="mt-1 text-sm text-slate-500">{branchName} · {orders.length} طلب</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          إنشاء طلب جديد
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">السيارة</th>
                <th className="px-5 py-3 text-start">اللوحة</th>
                <th className="px-5 py-3 text-start">الخدمة</th>
                <th className="px-5 py-3 text-start">العميل</th>
                <th className="px-5 py-3 text-start">الفني المسؤول</th>
                <th className="px-5 py-3 text-start">الحالة</th>
                <th className="px-5 py-3 text-start">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="text-sm font-bold text-slate-700">لا توجد طلبات في هذا الفرع بعد</div>
                    <button onClick={() => setOpen(true)} className="mt-3 text-sm font-extrabold text-brand">+ إنشاء أول طلب</button>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const m = META[o.status] || META.pending;
                  const car = [o.car_make, o.car_model].filter(Boolean).join(' ') || 'مركبة';
                  return (
                    <tr key={o.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{car}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center overflow-hidden rounded border-2 border-gray-800 font-mono text-xs">
                          <span className="bg-gray-800 px-1 text-[8px] font-bold text-white">KSA</span>
                          <span className="px-2 py-0.5 font-extrabold tracking-widest">{o.plate || '—'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{o.service_type || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{o.customer_name || o.customer_phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        {o.assigned_to ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-[10px] font-extrabold text-brand">{(workerMap[o.assigned_to] || 'ف').charAt(0)}</span>
                            {workerMap[o.assigned_to] || 'فني'}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">غير مُسند</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TINT[o.status] || STATUS_TINT.pending}`}>{m.ar}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{fmtDate(o.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOrderModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => { refetch(); showToast('تم إنشاء الطلب وإسناده للفني'); }}
        centerId={centerId}
        branchId={effBranchId}
        centerType={centerType}
      />
      <Toast toast={toast} />
    </div>
  );
}
