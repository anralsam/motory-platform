'use client';
import { useEffect, useMemo, useState } from 'react';
import { waNormalize } from '@/lib/team';

// Smart template engine. Variables: [Customer Name], [Car Model], [Center Name].
const TEMPLATES = [
  {
    key: 'ready', label: 'السيارة جاهزة', tag: 'تشغيلي', tone: 'emerald',
    text: 'مرحباً [Customer Name]، سيارتك [Car Model] جاهزة الآن للاستلام في [Center Name]. نسعد بخدمتك!',
  },
  {
    key: 'offer', label: 'عرض خاص', tag: 'تسويقي', tone: 'violet',
    text: 'مرحباً [Customer Name]، اشتقنا لزيارتك! خصم 20% على زيارتك القادمة لـ [Center Name] صالح لمدة أسبوع. ننتظرك!',
  },
  {
    key: 'feedback', label: 'تقييم الخدمة', tag: 'ما بعد الخدمة', tone: 'blue',
    text: 'مرحباً [Customer Name]، شكراً لزيارتك [Center Name]. يهمنا رأيك، كيف كانت تجربتك معنا اليوم؟',
  },
  { key: 'custom', label: 'رسالة مخصصة', tag: 'حر', tone: 'slate', text: '' },
];

const TONE = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

function inject(text, customer, centerName) {
  const car = [customer?.car_make, customer?.car_model].filter(Boolean).join(' ') || 'سيارتك';
  return String(text || '')
    .replaceAll('[Customer Name]', customer?.full_name || 'عميلنا العزيز')
    .replaceAll('[Car Model]', car)
    .replaceAll('[Center Name]', centerName || 'مركزنا');
}

export default function MessageCustomerDrawer({ open, onClose, customer, centerName }) {
  const [activeKey, setActiveKey] = useState('ready');
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    if (open) { setActiveKey('ready'); setCustomText(''); }
  }, [open, customer]);

  const finalMessage = useMemo(() => {
    if (activeKey === 'custom') return customText;
    const t = TEMPLATES.find((x) => x.key === activeKey);
    return inject(t?.text, customer, centerName);
  }, [activeKey, customText, customer, centerName]);

  if (!open || !customer) return null;

  function send() {
    const num = waNormalize(customer.phone);
    const url = (num ? `https://wa.me/${num}` : 'https://wa.me/') + `?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      {/* Slide-over drawer (anchored to the inline-start edge for RTL) */}
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">مراسلة العميل</h3>
            <p className="text-xs text-gray-500">{customer.full_name || 'عميل'} · <span className="ltr">{customer.phone}</span></p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <span className="mb-2 block text-xs font-bold text-gray-600">قوالب الرسائل</span>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveKey(t.key)}
                  className={`rounded-xl border p-3 text-start transition ${activeKey === t.key ? 'border-brand ring-2 ring-brand/15' : 'border-slate-200 hover:border-slate-200'}`}
                >
                  <span className={`mb-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${TONE[t.tone]}`}>{t.tag}</span>
                  <div className="text-sm font-extrabold text-gray-900">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {activeKey === 'custom' && (
            <div>
              <span className="mb-1.5 block text-xs font-bold text-gray-600">اكتب رسالتك</span>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={5}
                placeholder="اكتب رسالة مخصصة..."
                className="w-full rounded-xl border border-slate-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15"
              />
            </div>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-bold text-gray-600">معاينة الرسالة</span>
            <div className="min-h-[96px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
              {finalMessage || <span className="text-gray-400">اختر قالباً أو اكتب رسالة…</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            onClick={send}
            disabled={!finalMessage.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3.5 text-base font-extrabold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" /></svg>
            إرسال عبر واتساب
          </button>
        </div>
      </div>
    </div>
  );
}
