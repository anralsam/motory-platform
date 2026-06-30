'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { invoiceTotals, invoiceNo, fmtSar, VAT_RATE } from '@/lib/billing';

/** Pseudo ZATCA QR placeholder — deterministic pattern from the invoice number. */
function FauxQR({ seed = '', size = 120 }) {
  const N = 21;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const cell = size / N;
  const rects = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
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
      if (on) rects.push(<rect key={x + '-' + y} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0f172a" />);
    }
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">{rects}</svg>;
}

export default function PublicReceiptPage({ params }) {
  const id = params?.id;
  const [state, setState] = useState({ loading: true, row: null, error: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) { setState({ loading: false, row: null, error: true }); return; }
      const { data, error } = await supabase.rpc('get_public_receipt', { p_id: id });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;
      if (error || !row) setState({ loading: false, row: null, error: true });
      else setState({ loading: false, row, error: false });
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (state.loading) {
    return <Shell><div className="py-20 text-center text-sm text-slate-400">جاري تحميل الفاتورة...</div></Shell>;
  }

  if (state.error || !state.row) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-500">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-slate-900">الفاتورة غير موجودة</h1>
          <p className="mt-1 text-sm text-slate-500">تأكد من صحة الرابط أو تواصل مع المركز.</p>
        </div>
      </Shell>
    );
  }

  const r = state.row;
  const t = invoiceTotals(r);
  const no = invoiceNo(r);
  const d = new Date(r.created_at);
  const car = [r.car_make, r.car_model].filter(Boolean).join(' ') || '—';
  const centerName = r.center_name || r.branch_name || 'VOLD MOTOR';

  return (
    <Shell>
      <div className="receipt-public overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-gray-50 to-white px-6 pt-7 pb-5">
          {r.logo_url ? (
            <img src={r.logo_url} alt={centerName} className="h-16 w-16 rounded-2xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-violet text-2xl font-extrabold text-white shadow-sm">
              {centerName.charAt(0)}
            </div>
          )}
          <div className="text-lg font-extrabold text-slate-900">{centerName}</div>
          {r.contact_phone && <div className="ltr text-xs text-slate-400">{r.contact_phone}</div>}
          <div className="mt-1 rounded-full bg-gray-900 px-3 py-1 text-[11px] font-bold text-white">فاتورة ضريبية مبسطة</div>
        </div>

        <div className="px-6 pb-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
            <Meta k="رقم الفاتورة" v={no} mono />
            <Meta k="الحالة" v="مدفوعة" green />
            <Meta k="التاريخ" v={d.toLocaleDateString('en-GB')} />
            <Meta k="الوقت" v={d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
            {r.vat_number ? <Meta k="الرقم الضريبي" v={r.vat_number} mono full /> : null}
          </div>

          {/* Customer + car */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 p-4">
            <div>
              <div className="text-xs text-slate-400">العميل</div>
              <div className="font-bold text-slate-900">{r.customer_name || 'عميل'}</div>
            </div>
            <div className="flex items-stretch overflow-hidden rounded-md border-2 border-gray-800 font-mono ltr">
              <span className="flex items-center bg-gray-800 px-1 text-[8px] font-bold leading-none text-white">KSA</span>
              <span className="px-2 py-1 text-sm font-extrabold tracking-widest text-slate-900">{r.plate || '—'}</span>
            </div>
          </div>

          {/* Line items */}
          <div className="mt-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="font-bold text-slate-900">{r.service_type || 'خدمة'}</div>
                <div className="text-xs text-slate-400">{car}</div>
              </div>
              <div className="font-extrabold text-slate-900">{fmtSar(t.net)} ر.س</div>
            </div>
            <div className="space-y-1.5 px-4 py-3 text-sm">
              <Line k="الإجمالي قبل الضريبة" v={fmtSar(t.net)} />
              <Line k={`ضريبة القيمة المضافة (${Math.round(VAT_RATE * 100)}%)`} v={fmtSar(t.vat)} />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <span className="text-base font-extrabold text-slate-900">الإجمالي</span>
              <span className="text-xl font-extrabold text-brand">{fmtSar(t.total)} <span className="text-sm">ر.س</span></span>
            </div>
          </div>

          {/* ZATCA QR */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="rounded-2xl border border-slate-200 p-3">
              <FauxQR seed={no} />
            </div>
            <div className="text-[11px] text-slate-400">رمز الاستجابة السريعة — هيئة الزكاة والضريبة (ZATCA)</div>
          </div>

          <div className="mt-5 text-center text-sm font-semibold text-slate-500">شكراً لزيارتكم 🤍</div>
          <div className="text-center text-[11px] text-slate-400">مدعوم بواسطة VOLD MOTOR</div>
        </div>
      </div>

      {/* Sticky Save/Print action (hidden on print) */}
      <div className="sticky bottom-0 z-10 mt-5 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-extrabold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          حفظ كملف PDF / طباعة
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
function Meta({ k, v, mono, green, full }) {
  return (
    <div className={full ? 'col-span-2 flex items-center justify-between' : 'flex items-center justify-between'}>
      <span className="text-slate-500">{k}</span>
      <span className={`font-bold ${green ? 'text-emerald-600' : 'text-slate-900'} ${mono ? 'font-mono ltr' : ''}`}>{v}</span>
    </div>
  );
}
function Line({ k, v }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{k}</span><span className="font-bold ltr">{v} ر.س</span>
    </div>
  );
}
