'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';

const EDGE = `${SUPABASE_URL}/functions/v1`;

const STATUS_LABEL = { pending: 'معلّق', approved: 'مفعّل', rejected: 'مرفوض' };
const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-100 text-red-700 ring-red-200',
};
const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'معلّقة' },
  { key: 'approved', label: 'مفعّلة' },
  { key: 'rejected', label: 'مرفوضة' },
];

function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [toast, setToast] = useState(null); // { msg, type }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── API helper (always uses a fresh access token) ──
  const adminCall = useCallback(
    async (body, tkn) => {
      const t = tkn || token;
      const res = await fetch(`${EDGE}/admin-merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'خطأ في الخادم');
      return json;
    },
    [token],
  );

  const loadAll = useCallback(
    async (tkn) => {
      setLoading(true);
      setError('');
      try {
        const [listRes, statsRes] = await Promise.all([
          adminCall({ action: 'list', status: 'all' }, tkn),
          adminCall({ action: 'stats' }, tkn),
        ]);
        setMerchants(listRes.merchants || []);
        setStats({
          pending: statsRes.pending ?? 0,
          approved: statsRes.approved ?? 0,
          rejected: statsRes.rejected ?? 0,
          total: statsRes.total ?? 0,
        });
      } catch (e) {
        setError(e.message || 'تعذّر تحميل البيانات');
      } finally {
        setLoading(false);
      }
    },
    [adminCall],
  );

  // ── Boot: get session token, then load ──
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        router.replace('/auth/signin?redirect=/vm-control-center');
        return;
      }
      const t = session.access_token;
      const email = session.user?.email || '';
      setToken(t);
      setAdminName(email.split('@')[0] || 'المدير');
      await loadAll(t);
    })();
    return () => {
      active = false;
    };
  }, [router, loadAll]);

  // ── Derived: filtered + searched list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filter === 'all' ? merchants : merchants.filter((m) => m.status === filter);
    if (q) {
      list = list.filter(
        (m) =>
          (m.shop_name || '').toLowerCase().includes(q) ||
          (m.owner_name || '').toLowerCase().includes(q) ||
          (m.phone || '').includes(q) ||
          (m.email || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [merchants, filter, search]);

  // ── Actions ──
  async function doApprove(id) {
    setBusyId(id);
    try {
      await adminCall({ action: 'approve', id });
      showToast('تم قبول المركز وإرسال إيميل الترحيب');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectId) return;
    const id = rejectId;
    setBusyId(id);
    try {
      await adminCall({ action: 'reject', id, notes: rejectNotes.trim() });
      setRejectId(null);
      setRejectNotes('');
      showToast('تم رفض الطلب');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function doSuspend(id) {
    setBusyId(id);
    try {
      await adminCall({ action: 'suspend', id });
      showToast('تم إيقاف تفعيل المركز');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/signin');
  }

  const statCards = [
    { key: 'pending', label: 'طلبات معلّقة', value: stats.pending, accent: 'text-amber-600', ring: 'ring-amber-100' },
    { key: 'approved', label: 'مراكز مفعّلة', value: stats.approved, accent: 'text-emerald-600', ring: 'ring-emerald-100' },
    { key: 'rejected', label: 'طلبات مرفوضة', value: stats.rejected, accent: 'text-red-600', ring: 'ring-red-100' },
    { key: 'total', label: 'إجمالي الطلبات', value: stats.total, accent: 'text-slate-900', ring: 'ring-slate-100' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900">
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M6 10 L24 42 L42 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-extrabold tracking-tight">لوحة الإدارة العليا</div>
              <div className="text-[11px] text-slate-500">VOLD MOTOR · إدارة المراكز</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-bold">{adminName || '—'}</div>
              <div className="text-[10px] text-slate-400">مدير المنصة</div>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {(adminName || 'A').charAt(0).toUpperCase()}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((c) => (
            <div key={c.key} className={`rounded-2xl border border-slate-200 bg-white p-4 ring-1 ${c.ring}`}>
              <div className="text-[11px] font-medium text-slate-500">{c.label}</div>
              <div className={`mt-1 text-2xl font-extrabold ${c.accent}`}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar: filters + search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count =
                f.key === 'all' ? stats.total : f.key === 'pending' ? stats.pending : f.key === 'approved' ? stats.approved : stats.rejected;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                  <span className={`ms-1.5 rounded px-1 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المركز، المالك، الجوال أو الإيميل…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pe-9 ps-3 text-sm outline-none transition focus:border-slate-400"
            />
            <svg
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        {/* Refresh */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-400">{loading ? 'جاري التحميل…' : `${filtered.length} نتيجة`}</div>
          <button
            onClick={() => loadAll()}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            تحديث
          </button>
        </div>

        {/* Content */}
        <div className="mt-3">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">{error}</div>
          ) : loading ? (
            <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-400">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-40">
                <circle cx="12" cy="12" r="10" /><path d="M8 15h8M9 9h.01M15 9h.01" />
              </svg>
              <p className="mt-3 text-sm">لا توجد طلبات في هذا القسم</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">المركز</th>
                      <th className="px-4 py-3">التواصل</th>
                      <th className="px-4 py-3">الموقع</th>
                      <th className="px-4 py-3">تاريخ التقديم</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold">{m.shop_name || '—'}</div>
                          <div className="text-xs text-slate-500">{m.owner_name || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div dir="ltr" className="text-right text-[13px]">{m.phone || '—'}</div>
                          <div dir="ltr" className="text-right text-xs text-slate-500">{m.email || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.location || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(m.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${STATUS_BADGE[m.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                            {STATUS_LABEL[m.status] || m.status}
                          </span>
                          {m.notes ? <div className="mt-1 max-w-[160px] text-[11px] text-slate-400">{m.notes}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          <RowActions m={m} busy={busyId === m.id} onApprove={() => doApprove(m.id)} onReject={() => { setRejectId(m.id); setRejectNotes(''); }} onSuspend={() => doSuspend(m.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {filtered.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold">{m.shop_name || '—'}</div>
                        <div className="text-xs text-slate-500">{m.owner_name || '—'}</div>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${STATUS_BADGE[m.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex justify-between gap-2"><dt className="text-slate-400">الجوال</dt><dd dir="ltr">{m.phone || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-400">الإيميل</dt><dd dir="ltr" className="truncate">{m.email || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-400">الموقع</dt><dd>{m.location || '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-slate-400">التاريخ</dt><dd className="text-slate-500">{fmtDate(m.created_at)}</dd></div>
                      {m.notes ? <div className="flex justify-between gap-2"><dt className="text-slate-400">ملاحظة</dt><dd className="text-slate-500">{m.notes}</dd></div> : null}
                    </dl>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <RowActions m={m} busy={busyId === m.id} onApprove={() => doApprove(m.id)} onReject={() => { setRejectId(m.id); setRejectNotes(''); }} onSuspend={() => doSuspend(m.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => setRejectId(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold">رفض الطلب</h3>
            <p className="mt-1 text-xs text-slate-500">سبب الرفض اختياري — يُحفظ مع الطلب ويظهر في سجل المراكز.</p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              autoFocus
              placeholder="سبب الرفض (اختياري)…"
              className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectId(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                إلغاء
              </button>
              <button
                onClick={confirmReject}
                disabled={busyId === rejectId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Per-row action buttons (status-aware) ──
function RowActions({ m, busy, onApprove, onReject, onSuspend }) {
  if (busy) {
    return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />;
  }
  if (m.status === 'pending') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <button onClick={onApprove} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">قبول</button>
        <button onClick={onReject} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100">رفض</button>
      </div>
    );
  }
  if (m.status === 'approved') {
    return <button onClick={onSuspend} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200">إيقاف التفعيل</button>;
  }
  if (m.status === 'rejected') {
    return <button onClick={onApprove} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">إعادة قبول</button>;
  }
  return null;
}
