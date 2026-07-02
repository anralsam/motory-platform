'use client';
import { useEffect, useState } from 'react';
import { invoiceTotals, invoiceNo, fmtSar, VAT_RATE } from '@/lib/billing';

/** Pseudo ZATCA QR placeholder — deterministic block pattern from the invoice id. */
function FauxQR({ seed = '', size = 96 }) {
  const N = 21;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const cell = size / N;
  const rects = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // finder squares in 3 corners
      const corner = (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
      let on;
      if (corner) {
        const lx = x < 7 ? x : x - (N - 7);
        const ly = y < 7 ? y : y - (N - 7);
        on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      } else {
        h ^= (x * 31 + y * 17); h = Math.imul(h, 16777619);
        on = (h >>> 0) % 2 === 0;
      }
      if (on) rects.push(<rect key={x + '-' + y} x={x * cell} y={y * cell} width={cell} height={cell} fill="#000" />);
    }
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">{rects}</svg>;
}

export default function ReceiptModal({ open, order, centerName, vatNumber, onClose }) {
  const [logo, setLogo] = useState(null);
  useEffect(() => { try { setLogo(localStorage.getItem('vm_logo')); } catch (e) {} }, [open]);
  if (!open || !order) return null;

  const t = invoiceTotals(order);
  const no = invoiceNo(order);
  const d = new Date(order.created_at);
  const car = [order.car_make, order.car_model].filter(Boolean).join(' ') || '—';
  const dash = '------------------------------';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 print:bg-white print:p-0" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="my-6 w-full max-w-[340px] print:my-0">
        {/* Receipt (the only thing that prints) */}
        <div className="print-receipt mx-auto w-[300px] rounded-xl bg-white p-5 font-mono text-[12px] leading-tight text-black shadow-2xl print:w-[80mm] print:rounded-none print:shadow-none">
          <div className="text-center">
            {logo ? <img src={logo} alt="" className="mx-auto mb-1 h-10 object-contain" /> : null}
            <div className="text-[15px] font-extrabold">{centerName || 'VOLD MOTOR'}</div>
            <div className="text-[11px]">فاتورة ضريبية مبسطة</div>
            <div className="text-[11px]">Simplified Tax Invoice</div>
            {vatNumber ? <div className="mt-0.5 text-[11px]">الرقم الضريبي: <span className="ltr font-bold">{vatNumber}</span></div> : null}
          </div>

          <div className="my-2 text-center text-[11px] tracking-tighter">{dash}</div>

          <Row k="رقم الفاتورة" v={no} />
          <Row k="التاريخ" v={d.toLocaleDateString('en-GB')} />
          <Row k="الوقت" v={d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
          <Row k="العميل" v={order.customer_name || '—'} />
          <Row k="اللوحة" v={order.plate || '—'} />
          <Row k="المركبة" v={car} />

          <div className="my-2 text-center text-[11px] tracking-tighter">{dash}</div>

          <div className="flex justify-between font-bold">
            <span>الخدمة</span><span>المبلغ</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="truncate pe-2">{order.service_type || 'خدمة'}</span>
            <span>{fmtSar(t.net)}</span>
          </div>

          <div className="my-2 text-center text-[11px] tracking-tighter">{dash}</div>

          <Row k="الإجمالي قبل الضريبة" v={fmtSar(t.net)} />
          <Row k={`ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}%)`} v={fmtSar(t.vat)} />
          <div className="mt-1 flex justify-between text-[14px] font-extrabold">
            <span>الإجمالي (⃀)</span><span>{fmtSar(t.total)}</span>
          </div>

          <div className="my-2 text-center text-[11px] tracking-tighter">{dash}</div>

          <div className="flex flex-col items-center gap-1 py-1">
            <FauxQR seed={no} />
            <div className="text-[10px] text-slate-600">رمز الاستجابة السريعة — ZATCA</div>
          </div>

          <div className="mt-2 text-center text-[11px]">شكراً لزيارتكم 🤍</div>
          <div className="text-center text-[10px] text-slate-500">مدعوم بواسطة VOLD MOTOR</div>
        </div>

        {/* Controls (hidden on print) */}
        <div className="mt-4 flex gap-2 print:hidden">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">إغلاق</button>
          <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
            طباعة الفاتورة
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-700">{k}</span>
      <span className="font-bold ltr">{v}</span>
    </div>
  );
}
