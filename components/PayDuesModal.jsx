'use client';
import { fmtSar, COMMISSION_RATE } from '@/lib/billing';

/**
 * PayDuesModal — presents the merchant's outstanding VOLD MOTOR platform dues and
 * routes to the payment method (currently bank transfer). A light intermediary над
 * BankTransferModal: `onBank` hands off to the transfer flow, `onClose` dismisses.
 */
export default function PayDuesModal({ open, billing, onClose, onBank }) {
  if (!open || !billing) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div dir="rtl" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between bg-gradient-to-br from-slate-900 to-blue-700 px-6 py-5 text-white">
          <div>
            <div className="text-sm font-bold opacity-90">تسديد مستحقات المنصة</div>
            <div className="mt-1.5 text-3xl font-extrabold tabular-nums">
              {fmtSar(billing.total_amount)} <span className="text-lg font-bold opacity-80">⃀</span>
            </div>
            <div className="mt-0.5 text-[11px] opacity-75">
              عمولة {(COMMISSION_RATE * 100).toLocaleString('en-US')}% على العمليات المنجزة · {billing.billing_period}
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-lg text-white/80 transition hover:bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm leading-relaxed text-slate-600">
            سدّد مستحقات هذا الشهر عبر تحويل بنكي، ثم ارفع إشعار الحوالة ليُراجَع ويُعتمد من الإدارة.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => { onBank?.(); onClose?.(); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></svg>
              الدفع عبر تحويل بنكي
            </button>
            <button onClick={onClose} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
