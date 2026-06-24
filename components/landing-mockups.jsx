'use client';

/* Lightweight, pixel-clean HTML/CSS mockups that mirror the real product. No images. */

function Plate({ value = 'أ ب ج 1234' }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border-2 border-gray-800 bg-white font-mono" dir="ltr">
      <span className="flex items-center bg-gray-800 px-1.5 text-[8px] font-bold leading-none text-white">KSA</span>
      <span className="px-2 py-1 text-sm font-extrabold tracking-widest text-gray-900">{value}</span>
    </div>
  );
}

export function PosMock() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-extrabold text-gray-900">إنشاء طلب جديد</div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">استقبال</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {['رقم الجوال', 'اسم العميل', 'الشركة', 'الطراز'].map((l, i) => (
          <div key={i}>
            <div className="mb-1 text-[11px] font-bold text-gray-500">{l}</div>
            <div className="h-8 rounded-lg border border-gray-200 bg-gray-50" />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-bold text-gray-500">رقم اللوحة</div>
        <Plate />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['غسيل VIP', 'تلميع', 'تنظيف داخلي'].map((s, i) => (
          <span key={i} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${i === 0 ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600'}`}>{s}</span>
        ))}
      </div>
      <button className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-extrabold text-white">إسناد لفني · إنشاء الطلب</button>
    </div>
  );
}

export function KanbanMock() {
  const cols = [
    { t: 'قيد الانتظار', tint: 'bg-amber-50 text-amber-700', cards: [{ c: 'تويوتا كامري', p: 'أ ب ج 1234' }] },
    { t: 'جاري العمل', tint: 'bg-blue-50 text-blue-700', cards: [{ c: 'لكزس ES', p: 'د ه و 5678' }] },
    { t: 'جاهزة', tint: 'bg-emerald-50 text-emerald-700', cards: [{ c: 'نيسان باترول', p: 'ع ز ي 3344' }] },
  ];
  return (
    <div className="grid w-full max-w-md grid-cols-3 gap-2.5">
      {cols.map((col, i) => (
        <div key={i} className="rounded-2xl bg-gray-100/70 p-2">
          <div className={`mb-2 rounded-lg px-2 py-1.5 text-center text-[11px] font-extrabold ${col.tint}`}>{col.t}</div>
          {col.cards.map((c, k) => (
            <div key={k} className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
              <div className="mb-1.5 truncate text-[12px] font-extrabold text-gray-900">{c.c}</div>
              <div className="inline-flex items-stretch overflow-hidden rounded border border-gray-800 font-mono text-[9px]" dir="ltr">
                <span className="bg-gray-800 px-1 text-white">KSA</span>
                <span className="px-1.5 font-extrabold tracking-wider">{c.p}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function AiMock() {
  const cards = [
    { tone: 'bg-blue-50/70 border-blue-100', ic: 'bg-blue-100 text-blue-600', t: 'فرصة في وقت الركود', b: 'ركود يوم الثلاثاء 9–12 — أطلق عرضاً ترويجياً.' },
    { tone: 'bg-amber-50/70 border-amber-100', ic: 'bg-amber-100 text-amber-600', t: 'ضغط عمل مرتفع', b: 'الجمعة تحتاج مناوبة إضافية لتقليل الانتظار.' },
    { tone: 'bg-rose-50/70 border-rose-100', ic: 'bg-rose-100 text-rose-600', t: 'ارتفاع زمن الخدمة', b: 'متوسط تغيير الزيت 45 دقيقة — راجع الأداء.' },
  ];
  return (
    <div className="w-full max-w-sm space-y-2.5">
      {cards.map((c, i) => (
        <div key={i} className={`flex items-start gap-3 rounded-2xl border p-3 ${c.tone}`}>
          <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${c.ic}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4L12 2z" /></svg>
          </span>
          <div>
            <div className="text-[13px] font-extrabold text-gray-900">{c.t}</div>
            <div className="mt-0.5 text-[12px] leading-snug text-gray-600">{c.b}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoiceMock() {
  const dash = '------------------------';
  return (
    <div className="w-[230px] rounded-2xl bg-white p-4 font-mono text-[11px] leading-tight text-black shadow-lg">
      <div className="text-center">
        <div className="text-[13px] font-extrabold">مركز رائد</div>
        <div className="text-[10px]">فاتورة ضريبية مبسطة</div>
      </div>
      <div className="my-1.5 text-center tracking-tighter text-gray-400">{dash}</div>
      {[['رقم الفاتورة', 'INV-9A1F'], ['التاريخ', '23/06/2026'], ['العميل', 'سعد العتيبي']].map(([k, v], i) => (
        <div key={i} className="flex justify-between"><span className="text-gray-600">{k}</span><span className="font-bold">{v}</span></div>
      ))}
      <div className="my-1.5 text-center tracking-tighter text-gray-400">{dash}</div>
      <div className="flex justify-between"><span>غسيل VIP</span><span>90.00</span></div>
      <div className="flex justify-between text-gray-600"><span>ض.ق.م 15%</span><span>13.50</span></div>
      <div className="mt-1 flex justify-between text-[13px] font-extrabold"><span>الإجمالي</span><span>103.50</span></div>
      <div className="my-1.5 text-center tracking-tighter text-gray-400">{dash}</div>
      <div className="flex flex-col items-center gap-1 py-1">
        <svg width="56" height="56" viewBox="0 0 24 24" className="text-gray-900"><path fill="currentColor" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2z" /></svg>
        <div className="text-[9px] text-gray-500">رمز ZATCA</div>
      </div>
    </div>
  );
}
