'use client';

/**
 * PayDuesModal — طريقة سداد مستحقات المنصة.
 * Two methods, one sheet:
 *   •  Apple Pay — official-style black button. Rendered enabled only on Apple
 *      devices that support it; routes through the Moyasar hosted page
 *      (startApplePay). If the gateway key is missing it degrades gracefully.
 *   • حوالة بنكية — opens the existing BankTransferModal (manual MVP flow).
 */
import { useState } from 'react';
import { applePayAvailable, gatewayConfigured, startApplePay } from '@/lib/checkout';
import { fmtSar } from '@/lib/billing';

export default function PayDuesModal({ open, billing, onClose, onBank }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open || !billing) return null;

  const canApple = typeof window !== 'undefined' && applePayAvailable();

  async function payApple() {
    setErr('');
    if (!gatewayConfigured()) {
      setErr('الدفع بـ Apple Pay سيتفعّل فور ربط بوابة الدفع (Moyasar). حالياً يمكنك السداد بالحوالة البنكية.');
      return;
    }
    setBusy(true);
    const res = await startApplePay(billing);
    setBusy(false);
    if (!res.ok) setErr('تعذّر فتح صفحة الدفع — جرّب الحوالة البنكية.');
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">تسديد المستحقات</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <p className="mt-1 text-sm text-slate-500">مستحقات منصة VOLD MOTOR · {billing.billing_period || ''}</p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="text-xs font-bold text-slate-500">المبلغ المستحق</div>
          <div className="mt-1 font-mono text-3xl font-extrabold tabular-nums text-slate-900" dir="ltr">{fmtSar(billing.total_amount || 0)} <span className="text-base font-bold text-slate-400">⃁</span></div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Apple Pay — official style: black, SF-like, the Apple mark + Pay */}
          <button onClick={payApple} disabled={busy || !canApple}
            title={canApple ? 'الدفع عبر Apple Pay' : 'متاح على أجهزة Apple (آيفون / ماك بسفاري)'}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-black py-3.5 text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40">
            <svg width="42" height="18" viewBox="0 0 165.5 105.97" fill="currentColor" aria-hidden="true"><path d="M150.7 0H14.82c-.57 0-1.14 0-1.7.003-.48.004-.95.01-1.43.023-1.04.028-2.09.09-3.12.274a10.5 10.5 0 0 0-2.96.976 9.93 9.93 0 0 0-4.35 4.35 10.46 10.46 0 0 0-.976 2.96C.09 9.62.03 10.67.003 11.71c-.013.48-.02.95-.023 1.43C-.02 13.71 0 14.28 0 14.85v76.28c0 .57-.02 1.13.003 1.7.004.48.01.95.023 1.43.028 1.04.09 2.09.274 3.12.185 1.04.5 2.02.976 2.96a9.92 9.92 0 0 0 4.35 4.35c.94.48 1.92.79 2.96.98 1.03.18 2.08.24 3.12.27.48.01.95.02 1.43.02.56.01 1.13.01 1.7.01H150.7c.57 0 1.13 0 1.7-.01.47 0 .95-.01 1.43-.02 1.04-.03 2.09-.09 3.12-.27a10.5 10.5 0 0 0 2.96-.98 9.94 9.94 0 0 0 4.35-4.35c.48-.94.79-1.92.97-2.96.19-1.03.24-2.08.27-3.12.02-.48.02-.95.02-1.43.01-.57.01-1.13.01-1.7V14.85c0-.57 0-1.14-.01-1.7 0-.48 0-.95-.02-1.43-.03-1.04-.08-2.09-.27-3.12a10.46 10.46 0 0 0-.97-2.96 9.94 9.94 0 0 0-4.35-4.35 10.5 10.5 0 0 0-2.96-.976c-1.03-.185-2.08-.246-3.12-.274-.48-.013-.96-.02-1.43-.023-.57-.003-1.13-.003-1.7-.003z" opacity="0"/><path d="M45.19 35.77c1.42-1.77 2.38-4.16 2.13-6.6-2.08.1-4.61 1.37-6.08 3.15-1.32 1.52-2.48 4-2.18 6.34 2.33.2 4.66-1.17 6.13-2.89m2.1 3.34c-3.39-.2-6.27 1.92-7.89 1.92-1.62 0-4.1-1.82-6.78-1.77a10 10 0 0 0-8.5 5.16c-3.64 6.28-.96 15.59 2.58 20.7 1.72 2.53 3.79 5.31 6.52 5.21 2.58-.1 3.59-1.67 6.73-1.67s4.04 1.67 6.78 1.62c2.83-.05 4.6-2.53 6.32-5.06 1.97-2.88 2.78-5.66 2.83-5.81-.05-.05-5.46-2.13-5.51-8.35-.05-5.21 4.25-7.69 4.45-7.84-2.43-3.59-6.22-3.99-7.53-4.09m22.66-5.44v30.4h4.72V53.68h6.53c5.97 0 10.16-4.09 10.16-10.02s-4.12-9.99-10-9.99h-11.4zm4.72 3.98h5.44c4.09 0 6.43 2.18 6.43 6.02s-2.34 6.05-6.45 6.05h-5.41V37.65zm25.3 26.66c2.96 0 5.71-1.5 6.96-3.88h.1v3.64h4.37V49.02c0-4.39-3.51-7.22-8.92-7.22-5.01 0-8.72 2.87-8.86 6.81h4.25c.35-1.87 2.08-3.1 4.47-3.1 2.89 0 4.51 1.35 4.51 3.83v1.68l-5.9.35c-5.49.33-8.46 2.58-8.46 6.49 0 3.95 3.07 6.57 7.47 6.57zm1.27-3.61c-2.52 0-4.12-1.21-4.12-3.07 0-1.92 1.55-3.03 4.5-3.21l5.26-.33v1.72c0 2.85-2.42 4.89-5.64 4.89zm16.28 11.65c4.6 0 6.77-1.76 8.66-7.09l8.29-23.26h-4.8l-5.56 17.97h-.1l-5.56-17.97h-4.94l8 22.15-.43 1.35c-.72 2.28-1.89 3.16-3.98 3.16-.37 0-1.09-.04-1.38-.08v3.65c.27.08 1.44.12 1.8.12z"/></svg>
            <span className="text-sm font-bold" dir="ltr">Pay</span>
          </button>
          {!canApple && (
            <p className="text-center text-[11px] font-semibold text-slate-400">Apple Pay متاح على آيفون وآيباد وماك (متصفح Safari)</p>
          )}

          {/* Bank transfer fallback */}
          <button onClick={() => { onClose?.(); onBank?.(); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 py-3.5 text-sm font-extrabold text-slate-700 transition hover:border-brand hover:text-brand">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>
            حوالة بنكية
          </button>
        </div>

        {err && <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-center text-xs font-bold text-amber-800">{err}</p>}
      </div>
    </div>
  );
}
