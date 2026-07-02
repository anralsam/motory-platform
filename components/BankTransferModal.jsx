'use client';
import { useEffect, useState } from 'react';
import { PLATFORM_BANK, startCheckout } from '@/lib/checkout';

function fmtSar(n) {
  return Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Manual bank-transfer checkout. Shows the platform bank details and lets the
 * merchant confirm they've transferred → status becomes VERIFYING (under review).
 */
export default function BankTransferModal({ open, billing, onClose, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { if (open) { setSubmitting(false); setError(''); setCopied(''); } }, [open]);
  if (!open || !billing) return null;

  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); } catch (e) {}
  }

  async function confirmTransfer() {
    setError('');
    setSubmitting(true);
    const res = await startCheckout(billing);
    setSubmitting(false);
    if (!res.ok) { setError(res.error || 'تعذّر تأكيد التحويل'); return; }
    onConfirmed?.();
    onClose?.();
  }

  const rows = [
    { k: 'البنك', v: PLATFORM_BANK.bank, key: 'bank' },
    { k: 'اسم الحساب', v: PLATFORM_BANK.accountName, key: 'acc' },
    { k: 'الآيبان (IBAN)', v: PLATFORM_BANK.iban, key: 'iban', mono: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">سداد عبر تحويل بنكي</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 px-5 py-4 text-white">
          <div className="text-xs font-bold opacity-80">المبلغ المطلوب تحويله</div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums">{fmtSar(billing.total_amount)} <span className="text-base opacity-80">⃀</span></div>
          <div className="mt-0.5 text-[11px] opacity-70">مستحقات منصة VOLD MOTOR · {billing.billing_period}</div>
        </div>

        {/* Bank details */}
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-500">{r.k}</div>
                <div className={`truncate text-sm font-extrabold text-slate-900 ${r.mono ? 'font-mono ltr' : ''}`}>{r.v}</div>
              </div>
              <button onClick={() => copy(r.v, r.key)} className="flex-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-brand">
                {copied === r.key ? 'تم النسخ ✓' : 'نسخ'}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          حوّل المبلغ إلى الحساب أعلاه ثم اضغط «تم التحويل». ستُراجع الحوالة ويتم تحديث الحالة إلى «مدفوعة» خلال يوم عمل.
        </p>

        {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
          <button onClick={confirmTransfer} disabled={submitting} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">
            {submitting && <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>}
            تم التحويل
          </button>
        </div>
      </div>
    </div>
  );
}
