'use client';

/**
 * WorkersFleetManager — the merchant's Secure Worker Fleet & Access Hub.
 * Hyper-dense YouTube-Studio surface: add workers, rotate magic-login keys,
 * block/unblock instantly, delete, and read the audited activity timeline.
 * Optimistic (setMembers) for sub-100ms transitions; RTL with logical props only.
 */
import { useState } from 'react';
import { UserPlus, KeyRound, Clock, Trash2, Copy, Check, ShieldOff, ShieldCheck, X, Send } from 'lucide-react';
import { createWorker, genPin, waNormalize } from '@/lib/team';
import { generateWorkerAccessToken, setWorkerActive, deleteWorker, getWorkerActivities } from '@/app/dashboard/workers-fleet/actions';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white';
const ROLE_LABEL = { manager: 'مشرف', technician: 'فنّي' };
const ACTION_LABEL = {
  login: 'تسجيل دخول', job_started: 'بدء مهمة', job_ready: 'جاهز للتسليم', job_completed: 'تسليم',
  job_update: 'تحديث مهمة', token_generated: 'إصدار مفتاح', blocked: 'إيقاف', unblocked: 'تفعيل',
  worker_deleted: 'حذف عامل', branch_transfer: 'نقل فرع',
};

export default function WorkersFleetManager({ centerId, branches = [], members, setMembers, refetch, loading }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('technician');
  const [branchId, setBranchId] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const [keyFor, setKeyFor] = useState(null);     // { worker, loginUrl }
  const [busyId, setBusyId] = useState(null);
  const [copied, setCopied] = useState(false);

  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState(null);           // null=loading, []=empty
  const [logWorker, setLogWorker] = useState(null);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || '—';
  const active = members.filter((m) => m.is_active ?? m.status === 'active');

  async function addWorker(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('اسم العامل مطلوب'); return; }
    if (!phone.trim()) { setErr('رقم الجوال مطلوب لإرسال رابط الدخول'); return; }
    setAdding(true);
    // A PIN still backs the account (pseudo-email auth); the worker logs in via the
    // magic link, so they never need it.
    const pin = genPin();
    const { worker, error } = await createWorker({
      full_name: name.trim(), phone: phone.trim(), role, pin,
      branch_id: branchId || (branches.find((b) => b.is_primary)?.id ?? branches[0]?.id ?? null),
    });
    setAdding(false);
    if (error) { setErr(error); return; }
    setMembers((prev) => [worker, ...prev]);
    setName(''); setPhone(''); setRole('technician'); setBranchId('');
  }

  async function genKey(worker) {
    setErr(''); setBusyId(worker.id); setCopied(false);
    const res = await generateWorkerAccessToken(worker.id);
    setBusyId(null);
    if (!res?.ok) { setErr(res?.error || 'تعذّر توليد المفتاح'); return; }
    setKeyFor({ worker, loginUrl: res.loginUrl });
  }

  async function toggleActive(worker) {
    const next = !(worker.is_active ?? worker.status === 'active');
    setBusyId(worker.id);
    const prev = members;
    setMembers((list) => list.map((m) => (m.id === worker.id ? { ...m, is_active: next, status: next ? 'active' : 'inactive' } : m)));
    const res = await setWorkerActive(worker.id, next);
    setBusyId(null);
    if (!res?.ok) { setMembers(prev); setErr(res?.error || 'تعذّر التحديث'); }
  }

  async function removeWorker(worker) {
    setBusyId(worker.id);
    const prev = members;
    setMembers((list) => list.filter((m) => m.id !== worker.id));
    const res = await deleteWorker(worker.id);
    setBusyId(null);
    if (!res?.ok) { setMembers(prev); setErr(res?.error || 'تعذّر الحذف'); }
  }

  async function openLog(worker) {
    setLogWorker(worker || null); setLog(null); setLogOpen(true);
    const res = await getWorkerActivities(150);
    const rows = res?.activities || [];
    setLog(worker ? rows.filter((r) => r.worker_id === worker.id) : rows);
  }

  function waInvite() {
    if (!keyFor) return;
    const p = waNormalize(keyFor.worker.phone || '');
    const msg = `مرحباً ${keyFor.worker.full_name || ''}\nرابط دخولك الآمن للوحة العمل في VOLD MOTOR:\n${keyFor.loginUrl}\n(صالح لمرة واحدة — لا تشاركه)`;
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">أسطول العمال والوصول الآمن</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">أضف العمال، أصدر مفاتيح دخول سحرية، أوقف الوصول فوراً، وراقب سجل النشاط.</p>
      </div>

      {/* Pulse */}
      <div className="grid grid-cols-3 gap-4">
        {[['إجمالي الفريق', members.length, 'text-slate-900'], ['نشطون', active.length, 'text-emerald-600'], ['موقوفون', members.length - active.length, 'text-rose-600']].map(([l, v, tone]) => (
          <div key={l} className={`${CARD} p-4`}>
            <div className="text-xs font-bold text-slate-500">{l}</div>
            <div className={`mt-1.5 font-mono text-2xl font-extrabold tabular-nums ${tone}`} dir="ltr">{loading ? '—' : v}</div>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className={`${CARD} p-8`}>
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><UserPlus size={18} /></span>
          <div className="text-base font-bold tracking-tight text-slate-900">إضافة عامل جديد</div>
        </div>
        <form onSubmit={addWorker} className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-4"><label className="mb-1.5 block text-xs font-bold text-slate-600">الاسم</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="مثال: سعيد الأحمدي" /></div>
          <div className="md:col-span-3"><label className="mb-1.5 block text-xs font-bold text-slate-600">الجوال</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className={INPUT} placeholder="05xxxxxxxx" /></div>
          <div className="md:col-span-2"><label className="mb-1.5 block text-xs font-bold text-slate-600">التخصص</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
              <option value="technician">فنّي</option><option value="manager">مشرف</option></select></div>
          <div className="md:col-span-3"><label className="mb-1.5 block text-xs font-bold text-slate-600">الفرع</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={INPUT}>
              <option value="">الفرع الرئيسي</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="md:col-span-12">
            <button type="submit" disabled={adding}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
              <UserPlus size={16} />{adding ? 'جارٍ الإضافة…' : 'إضافة عامل جديد'}</button>
          </div>
        </form>
        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-700">{err}</p>}
      </div>

      {/* Fleet table */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">مصفوفة العمال</h3>
          <button onClick={() => openLog(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
            <Clock size={13} />سجل النشاط الكامل</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
              <th className="px-5 py-3 text-start">العامل</th><th className="px-5 py-3 text-start">الفرع</th>
              <th className="px-5 py-3 text-start">الحالة</th><th className="px-5 py-3 text-end">الإجراءات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">لا عمّال بعد — أضف أول عامل بالأعلى.</td></tr>
              ) : members.map((m) => {
                const isActive = m.is_active ?? m.status === 'active';
                return (
                  <tr key={m.id} className={`text-sm ${busyId === m.id ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{m.full_name || 'عامل'}</div>
                      <div className="text-xs font-semibold text-slate-400">{ROLE_LABEL[m.role] || 'فنّي'}{m.phone ? <span dir="ltr"> · {m.phone}</span> : null}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{branchName(m.branch_id)}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {isActive ? 'نشط' : 'موقوف'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => genKey(m)} disabled={!isActive || busyId === m.id} title="توليد مفتاح دخول"
                          className="grid h-8 w-8 place-items-center rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-30"><KeyRound size={15} /></button>
                        <button onClick={() => openLog(m)} title="سجل النشاط"
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Clock size={15} /></button>
                        <button onClick={() => toggleActive(m)} title={isActive ? 'إيقاف' : 'تفعيل'}
                          className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          {isActive ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}</button>
                        <button onClick={() => removeWorker(m)} title="حذف"
                          className="grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated-key sheet */}
      {keyFor && (
        <div dir="rtl" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setKeyFor(null); }}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">مفتاح دخول {keyFor.worker.full_name}</h3>
              <button onClick={() => setKeyFor(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <p className="mt-1 text-sm text-slate-500">رابط سحري صالح لمرة واحدة (7 أيام). يفتح لوحة العامل مباشرةً.</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <code dir="ltr" className="flex-1 truncate text-xs font-semibold text-slate-700">{keyFor.loginUrl}</code>
              <button onClick={() => { navigator.clipboard?.writeText(keyFor.loginUrl); setCopied(true); }}
                className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white text-slate-600 shadow-sm">{copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}</button>
            </div>
            <button onClick={waInvite} disabled={!keyFor.worker.phone}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-40">
              <Send size={16} />إرسال الرابط عبر واتساب</button>
          </div>
        </div>
      )}

      {/* Activity ledger (slide-in) */}
      {logOpen && (
        <div dir="rtl" className="fixed inset-0 z-50 flex justify-start bg-slate-900/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setLogOpen(false); }}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-e border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="text-lg font-black text-slate-900">سجل النشاط</h3>
                <p className="text-xs font-semibold text-slate-500">{logWorker ? logWorker.full_name : 'كل العمال'} · الأحدث أولاً</p></div>
              <button onClick={() => setLogOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {log === null ? (
              <div className="py-16 text-center text-sm text-slate-400">جاري التحميل…</div>
            ) : log.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400">لا نشاط مسجّل بعد.</div>
            ) : (
              <ol className="relative space-y-3 border-s-2 border-slate-100 ps-4">
                {log.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="text-sm font-bold text-slate-900">{ACTION_LABEL[a.action_type] || a.action_type}</div>
                    {a.description ? <div className="text-xs font-medium text-slate-500">{a.description}</div> : null}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[11px] font-semibold tabular-nums text-slate-400" dir="ltr">{new Date(a.timestamp).toLocaleString('en-GB')}</span>
                      {a.duration_min != null && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600">المدة: {a.duration_min} د</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
