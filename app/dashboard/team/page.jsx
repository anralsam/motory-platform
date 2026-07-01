'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { useTeam } from '@/lib/useTeam';
import { roleOf } from '@/lib/roles';
import { supabase } from '@/lib/supabaseClient';
import { genPin, setPin, pinFor, whatsappLink, createWorker } from '@/lib/team';
import AddStaffModal from '@/components/AddStaffModal';
import StaffPermissionMatrix from '@/components/StaffPermissionMatrix';
import Toast from '@/components/Toast';

const ROLE_BADGE = {
  manager: 'bg-violet-100 text-violet-700',
  technician: 'bg-slate-100 text-slate-700',
};
const ROLE_LABEL = { manager: 'مشرف', technician: 'فني' };

export default function TeamPage() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const branchName = selectedId === 'all' ? 'كل الفروع' : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { members, loading, error, refetch, setMembers } = useTeam(user?.id, selectedId);

  const [open, setOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [teamSearch, setTeamSearch] = useState('');
  const shown = members.filter((m) => {
    const okRole = roleFilter === 'all' || (m.role || 'technician') === roleFilter;
    const q = teamSearch.trim().toLowerCase();
    const okQ = !q || (m.full_name || '').toLowerCase().includes(q) || (m.phone || '').includes(q);
    return okRole && okQ;
  });
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }

  // ── OWNER-only route protection ──
  if (myRole !== 'owner') {
    return (
      <div className="mx-auto grid max-w-md place-items-center py-20 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">الوصول مرفوض</h1>
        <p className="mt-1 text-sm text-slate-500">إدارة الفريق متاحة لمالك المركز فقط.</p>
        <Link href="/dashboard" className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">العودة للرئيسية</Link>
      </div>
    );
  }

  async function addStaff({ fullName, phone, role }) {
    // Generate the 4-digit PIN, then provision a REAL Supabase Auth user via the
    // create-worker edge function (pseudo-email + PIN) which also inserts the staff row.
    const pin = genPin();
    const { worker, error: err } = await createWorker({
      full_name: fullName,
      phone,
      role,
      pin,
      branch_id: selectedId && selectedId !== 'all' ? selectedId : null,
    });
    if (err) return { error: err };
    setPin(worker.id, pin);
    await refetch();
    showToast('تم إنشاء حساب الموظف');
    return { worker, pin };
  }

  async function toggleStatus(m) {
    const next = m.status === 'active' ? 'inactive' : 'active';
    const { error: err } = await supabase.from('workers').update({ status: next }).eq('id', m.id);
    if (err) { showToast('تعذّر التحديث', 'error'); return; }
    await refetch();
    showToast(next === 'active' ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
  }

  function sendLink(m) {
    window.open(whatsappLink(m, pinFor(m.id)), '_blank');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">إدارة الفريق</h1>
          <p className="mt-1 text-sm text-slate-500">{branchName} · حسابات العمال والمشرفين، صلاحياتهم، وروابط دخولهم</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          إضافة موظف
        </button>
      </div>

      {/* Team pulse strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['إجمالي الفريق', members.length, 'text-slate-900'],
          ['نشطون الآن', members.filter((m) => m.status === 'active').length, 'text-emerald-600'],
          ['فنّيون', members.filter((m) => (m.role || 'technician') === 'technician').length, 'text-blue-600'],
          ['مشرفون', members.filter((m) => m.role === 'manager').length, 'text-violet-600'],
        ].map(([l, v, tone]) => (
          <div key={l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-slate-500">{l}</div>
            <div className={`mt-1.5 font-mono text-2xl font-extrabold tabular-nums ${tone}`} dir="ltr">{loading ? '—' : v.toLocaleString('en')}</div>
          </div>
        ))}
      </div>

      {/* Role filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        {[['all', 'الكل'], ['technician', 'الفنّيون'], ['manager', 'المشرفون']].map(([k, label]) => (
          <button key={k} onClick={() => setRoleFilter(k)}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${roleFilter === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
        <div className="relative ms-auto max-w-xs flex-1">
          <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">الاسم</th>
                <th className="px-5 py-3 text-start">المنصب</th>
                <th className="px-5 py-3 text-start">رقم الجوال</th>
                <th className="px-5 py-3 text-start">حالة الحساب</th>
                <th className="px-5 py-3 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="text-sm font-bold text-slate-700">لا يوجد موظفون في هذا الفرع بعد</div>
                    <button onClick={() => setOpen(true)} className="mt-3 text-sm font-extrabold text-brand">+ إضافة أول موظف</button>
                  </td>
                </tr>
              ) : (
                shown.map((m) => {
                  const active = m.status === 'active';
                  return (
                    <tr key={m.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-extrabold text-white">
                            {(m.full_name || 'ع').charAt(0)}
                          </span>
                          <span className="font-bold text-slate-900">{m.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${ROLE_BADGE[m.role] || ROLE_BADGE.technician}`}>
                          {ROLE_LABEL[m.role] || 'فني'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700 ltr text-start">{m.phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {active ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => sendLink(m)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-extrabold text-white transition hover:brightness-105"
                            title="إرسال رابط الدخول عبر واتساب"
                          >
                            <WaIcon /> إرسال رابط الدخول
                          </button>
                          <button
                            onClick={() => toggleStatus(m)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-slate-200"
                          >
                            {active ? 'إيقاف' : 'تفعيل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffPermissionMatrix members={members} setMembers={setMembers} showToast={showToast} />

      <AddStaffModal open={open} onClose={() => setOpen(false)} onSubmit={addStaff} />
      <Toast toast={toast} />
    </div>
  );
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
  );
}
