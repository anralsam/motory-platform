'use client';

/**
 * AcceptanceTable — full Center-Approval console (migrated from vm-control-center).
 * Data-grid (no <table>): status filters + counts, search, and status-aware
 * actions wired to the admin-merchants Edge Function (admin JWT; re-verified
 * server-side). Resulting statuses: approve/unlock → approved · reject/suspend →
 * rejected. Optimistic row update. VOLD MOTOR System Token.
 */
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import NoData from './NoData';
import StatusPill from './StatusPill';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;
const RESULT = { approve: 'approved', reject: 'rejected', suspend: 'rejected', unlock: 'approved' };
const FILTERS = [
  { k: 'all', label: 'الكل' },
  { k: 'pending', label: 'معلّق' },
  { k: 'approved', label: 'مفعّل' },
  { k: 'rejected', label: 'مرفوض' },
  { k: 'locked', label: 'مقفول' },
];

// Status-aware actions (mirrors the old control-room RowActions).
function actionsFor(status) {
  if (status === 'pending') return [{ a: 'approve', t: 'قبول', c: 'bg-emerald-600 hover:bg-emerald-700' }, { a: 'reject', t: 'رفض', c: 'bg-rose-600 hover:bg-rose-700' }];
  if (status === 'approved') return [{ a: 'suspend', t: 'إيقاف', c: 'bg-amber-600 hover:bg-amber-700' }];
  if (status === 'rejected') return [{ a: 'approve', t: 'إعادة قبول', c: 'bg-emerald-600 hover:bg-emerald-700' }];
  if (status === 'locked') return [{ a: 'unlock', t: 'فكّ القفل', c: 'bg-fuchsia-600 hover:bg-fuchsia-700' }];
  return [];
}

export default function AcceptanceTable({ initialRows = [] }) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const counts = useMemo(() => rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {}), [rows]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (filter === 'all' || r.status === filter) &&
      (!term || [r.shop_name, r.owner_name, r.email, r.phone].some((v) => (v || '').toLowerCase().includes(term))),
    );
  }, [rows, filter, q]);

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
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: RESULT[action] || r.status } : r)));
      setToast({ ok: true, msg: 'تم تنفيذ الإجراء' });
    } catch (e) {
      setToast({ ok: false, msg: e.message });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2600);
    }
  }

  if (!rows.length) return <NoData title="لا توجد طلبات" hint="لا توجد طلبات انضمام لعرضها حالياً." />;

  return (
    <div className="space-y-3">
      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.k;
          const n = f.k === 'all' ? rows.length : counts[f.k] || 0;
          return (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-all duration-300 ${on ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>
              {f.label}<span className={`tabular-nums ${on ? 'text-white/70' : 'text-slate-400'}`}>{n}</span>
            </button>
          );
        })}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…"
          className="ms-auto min-h-[36px] w-40 rounded-full border border-slate-200 bg-white px-4 text-sm outline-none transition-colors focus:border-blue-600" />
      </div>

      {/* Data grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">لا نتائج في هذا الفلتر</p>
          ) : visible.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-6 py-4 transition-colors duration-300 hover:bg-slate-100/60">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{r.shop_name || '—'}</div>
                <div className="truncate text-xs text-slate-400">
                  {r.owner_name || ''}{r.email ? <span dir="ltr"> · {r.email}</span> : null}{r.phone ? <span dir="ltr"> · {r.phone}</span> : null}
                </div>
              </div>
              <StatusPill status={r.status} />
              <div className="flex gap-2">
                {actionsFor(r.status).map((b) => (
                  <button key={b.a} disabled={busyId === r.id} onClick={() => act(r.id, b.a)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 ${b.c}`}>{b.t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg lg:bottom-6 ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
