'use client';
import { useEffect, useState } from 'react';
import { buildLoginMessage, whatsappLink } from '@/lib/team';

/**
 * Add-staff modal. Two phases:
 *  1) form (name, phone=login id, role)
 *  2) success — shows the generated 4-digit PIN + a WhatsApp "send credentials" button.
 * `onSubmit({fullName, phone, role})` must return { worker, pin } or { error }.
 */
export default function AddStaffModal({ open, onClose, onSubmit }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('technician');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { worker, pin }

  useEffect(() => {
    if (open) { setFullName(''); setPhone(''); setRole('technician'); setError(''); setSaving(false); setCreated(null); }
  }, [open]);

  if (!open) return null;

  async function save() {
    setError('');
    if (!fullName.trim()) { setError('الرجاء إدخال اسم الموظف'); return; }
    if (!phone.trim()) { setError('رقم الجوال مطلوب (يُستخدم كمعرّف الدخول)'); return; }
    setSaving(true);
    const res = await onSubmit({ fullName: fullName.trim(), phone: phone.trim(), role });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    setCreated({ worker: res.worker, pin: res.pin });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">{created ? 'تم إنشاء حساب الموظف' : 'إضافة موظف جديد'}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!created ? (
          <>
            <p className="mb-4 text-xs text-gray-500">يُضاف للفرع الحالي ويحصل على رمز سري للدخول.</p>
            {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}
            <div className="space-y-4">
              <Field label="الاسم الكامل">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="محمد أحمد" className={inputCls} />
              </Field>
              <Field label="رقم الجوال (معرّف الدخول)">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="numeric" placeholder="05XXXXXXXX" className={`${inputCls} text-right`} />
              </Field>
              <Field label="المنصب">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                  <option value="technician">فني — لوحة المهام فقط</option>
                  <option value="manager">مشرف — عمليات وعملاء (بدون مالية)</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">
                {saving && <Spinner />} إنشاء الحساب
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <p className="text-sm text-gray-500">شارك بيانات الدخول مع الموظف:</p>
            <div className="mt-3 space-y-1.5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <Row k="الاسم" v={created.worker.full_name} />
              <Row k="رقم الجوال" v={created.worker.phone} ltr />
              <Row k="الرمز السري" v={created.pin} ltr strong />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">تم</button>
              <a
                href={whatsappLink(created.worker, created.pin)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 py-2.5 text-sm font-extrabold text-white transition hover:brightness-105"
              >
                <WaIcon /> إرسال عبر واتساب
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      {children}
    </label>
  );
}
function Row({ k, v, ltr, strong }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{k}</span>
      <span className={`font-bold text-gray-900 ${ltr ? 'ltr' : ''} ${strong ? 'text-base tracking-widest' : ''}`}>{v}</span>
    </div>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
  );
}
function WaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
  );
}
