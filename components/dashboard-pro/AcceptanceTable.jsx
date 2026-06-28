'use client';

/**
 * AcceptanceTable — custom Data Grid (NOT a basic table) for merchant join
 * requests. Each row hover:bg-slate-100, pill-shaped status badges. Accept/reject
 * go through the authorized admin-merchants Edge Function (admin JWT; the function
 * re-verifies admin server-side). Optimistic row update.
 */
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import NoData from './NoData';
import StatusPill from './StatusPill';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-6 py-4 transition-colors duration-200 hover:bg-slate-100/60">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{r.shop_name || '—'}</div>
              <div className="truncate text-xs font-normal text-slate-400" dir="ltr">{r.email || r.owner_name || ''}</div>
            </div>
            <StatusPill status={r.status} />
            {r.status === 'pending' ? (
              <div className="flex gap-2">
                <button disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-emerald-700 disabled:opacity-50">قبول</button>
                <button disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-rose-700 disabled:opacity-50">رفض</button>
              </div>
            ) : (
              <span className="text-xs text-slate-300">—</span>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className={`pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-6 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
