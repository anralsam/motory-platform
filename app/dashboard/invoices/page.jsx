'use client';
import { useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { usePermissions } from '@/lib/usePermissions';
import Forbidden403 from '@/components/Forbidden403';
import { useInvoices } from '@/lib/useInvoices';
import { usePlatformBilling } from '@/lib/usePlatformBilling';
import BankTransferModal from '@/components/BankTransferModal';
import PayDuesModal from '@/components/PayDuesModal';
import { invoiceTotals, invoiceNo, fmtSar, COMMISSION_RATE } from '@/lib/billing';
import { waNormalize } from '@/lib/team';
import ReceiptModal from '@/components/ReceiptModal';
import Toast from '@/components/Toast';

function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return '—'; } }

export default function InvoicesPage() {
  const { user } = useAuth();
  const { canViewFinancials } = usePermissions();
  const myRole = roleOf(user?.user_metadata?.role);
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const branchName = selectedId === 'all' ? 'كل الفروع' : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { invoices, loading, error, dues } = useInvoices(centerId, selectedId);
  const { billing, loading: billingLoading, refetch: refetchBilling } = usePlatformBilling(centerId);
  const [bankOpen, setBankOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }

  const monthLabel = new Date().toLocaleDateString('ar', { month: 'long', year: 'numeric' });
  const centerName = user?.user_metadata?.center_name || branchName;

  // Send a digital-receipt link to the customer over WhatsApp (free wa.me).
  function sendInvoiceWhatsApp(o) {
    if (!o.customer_phone) { showToast('لا يوجد رقم جوال لهذا العميل', 'error'); return; }
    const t = invoiceTotals(o);
    const base = (typeof window !== 'undefined' ? window.location.origin : 'https://voldmotor.com');
    const url = base + '/receipt/' + o.id;
    const msg =
      `مرحباً ${o.customer_name || 'عميلنا العزيز'}،\n` +
      `شكراً لزيارتك ${centerName}.\n` +
      `تم إصدار فاتورتك رقم #${invoiceNo(o)} بقيمة ${fmtSar(t.total)} ريال لخدمة ${o.service_type || 'الخدمة'}.\n\n` +
      `📄 يمكنك عرض وتحميل الفاتورة الإلكترونية عبر الرابط التالي:\n${url}\n\n` +
      `نسعد بخدمتك دائماً!`;
    const num = waNormalize(o.customer_phone);
    window.open((num ? `https://wa.me/${num}` : 'https://wa.me/') + `?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // Financial route — gated by can_view_financials (owners always pass).
  if (!canViewFinancials) return <Forbidden403 title="صفحة مالية محظورة — 403" hint="الفواتير والعمولات متاحة لمن يملك صلاحية «عرض المالية». تواصل مع مالك المركز." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">الفواتير</h1>
        <p className="mt-1 text-sm text-slate-500">{branchName} · {invoices.length} فاتورة</p>
      </div>

      {/* ── Platform commission banner ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-blue-700 p-[1px] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-700 px-6 py-5 text-white">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold opacity-90">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              مستحقات منصة VOLD MOTOR · {monthLabel}
            </div>
            <div className="mt-1.5 text-3xl font-extrabold tabular-nums">
              {billingLoading ? '—' : fmtSar(billing ? billing.total_amount : 0)} <span className="text-lg font-bold opacity-80">⃁</span>
            </div>
            <div className="mt-1 text-xs opacity-80">
              {billing
                ? `عمولة ${(COMMISSION_RATE * 100).toLocaleString('en-US')}% على العمليات المنجزة — ${dues.count} طلب هذا الشهر`
                : 'لا توجد مستحقات لهذا الشهر'}
            </div>
          </div>

          {billing && billing.status === 'PAID' ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-white/30">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              تم السداد
            </span>
          ) : billing && billing.status === 'VERIFYING' ? (
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-amber-950 shadow-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              جاري مراجعة الحوالة
            </span>
          ) : billing && billing.status === 'PENDING' ? (
            <button
              onClick={() => setPayOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              تسديد المستحقات
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Invoices table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">رقم الفاتورة</th>
                <th className="px-5 py-3 text-start">التاريخ</th>
                <th className="px-5 py-3 text-start">العميل</th>
                <th className="px-5 py-3 text-start">الخدمة</th>
                <th className="px-5 py-3 text-start">الإجمالي</th>
                <th className="px-5 py-3 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">لا توجد فواتير (طلبات مكتملة) في هذا الفرع بعد</td></tr>
              ) : (
                invoices.map((o) => {
                  const t = invoiceTotals(o);
                  return (
                    <tr key={o.id} className="text-sm transition hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">{invoiceNo(o)}</td>
                      <td className="px-5 py-3.5 text-slate-500">{fmtDate(o.created_at)}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{o.customer_name || o.customer_phone || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{o.service_type || '—'}</td>
                      <td className="px-5 py-3.5 font-extrabold text-brand">{fmtSar(t.total)} ⃁</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setReceipt(o)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-brand">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                            طباعة الفاتورة
                          </button>
                          <button onClick={() => sendInvoiceWhatsApp(o)} disabled={!o.customer_phone} title="إرسال الفاتورة عبر واتساب"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-1.5 text-xs font-extrabold text-white transition hover:brightness-105 disabled:opacity-40">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
                            إرسال
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

      <PayDuesModal
        open={payOpen}
        billing={billing}
        onClose={() => setPayOpen(false)}
        onBank={() => setBankOpen(true)}
      />

      <BankTransferModal
        open={bankOpen}
        billing={billing}
        onClose={() => setBankOpen(false)}
        onConfirmed={() => { refetchBilling(); showToast('تم استلام إشعار التحويل — قيد المراجعة'); }}
      />

      <ReceiptModal
        open={!!receipt}
        order={receipt}
        centerName={user?.user_metadata?.center_name || branchName}
        vatNumber={user?.user_metadata?.vat_number}
        onClose={() => setReceipt(null)}
      />
      <Toast toast={toast} />
    </div>
  );
}
