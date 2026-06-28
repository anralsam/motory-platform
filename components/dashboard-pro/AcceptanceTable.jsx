'use client';

/**
 * AcceptanceTable — admin accept/reject for pending merchant join requests.
 * Receives initial rows from the Server Component. Mutations go through the
 * existing `admin-merchants` Edge Function, authorized with the admin's own JWT
 * (the function re-verifies admin server-side). The service-role key is never
 * touched here. Pure Tailwind, YouTube-Studio-Light.
 */
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import NoData from './NoData';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;
const STATUS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  locked: 'bg-fuchsia-50 text-fuchsia-700',
};
const STATUS_AR = { pending: 'معلّق', approved: 'مفعّل', rejected: 'مرفوض', locked: 'مقفول' };

export default function AcceptanceTable({ initialRows = [] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  async function act(id, action) {
    setBusyId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(EDGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'خطأ في الخادم');
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)));
      setToast({ ok: true, msg: action === 'approve' ? 'تم القبول' : 'تم الرفض' });
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2600);
    }
  }

  if (!rows.length) return <NoData title="لا توجد طلبات" hint="لا توجد طلبات انضمام لعرضها حالياً." />;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-start text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 text-start">المركز</th>
              <th className="px-4 py-3 text-start">البريد</th>
              <th className="px-4 py-3 text-start">الحالة</th>
              <th className="px-4 py-3 text-end">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{r.shop_name || '—'}</div>
                  <div className="text-xs text-slate-500">{r.owner_name || ''}</div>
                </td>
                <td className="px-4 py-3 text-slate-600" dir="ltr">{r.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${STATUS[r.status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_AR[r.status] || r.status}</span>
                </td>
                <td className="px-4 py-3">
                  {r.status === 'pending' ? (
                    <div className="flex justify-end gap-2">
                      <button disabled={busyId === r.id} onClick={() => act(r.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">قبول</button>
                      <button disabled={busyId === r.id} onClick={() => act(r.id, 'reject')} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">رفض</button>
                    </div>
                  ) : (
                    <div className="text-end text-xs text-slate-400">—</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className={`pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-bold text-white lg:bottom-6 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
