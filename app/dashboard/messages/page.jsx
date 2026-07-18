'use client';

/**
 * الرسائل — مركز التواصل مع العملاء (the owner's most important surface).
 * Wired straight into the customers table: pick one or many customers, choose a
 * smart template (عروض / فواتير / جاهزية / تقييم / مخصص) with live variable
 * injection, preview the exact text, then dispatch over WhatsApp:
 *   • عميل واحد  → wa.me deep link opens instantly.
 *   • إرسال جماعي → sequential wa.me tabs (rate-friendly), progress counter.
 * The worker keeps his own one-tap invoice-over-WhatsApp from his console; this
 * page is the OWNER's broadcast desk (campaigns, offers, invoices, follow-ups).
 */
import { useMemo, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { useCustomers } from '@/lib/useCustomers';
import { waUrl } from '@/lib/whatsapp';

const TEMPLATES = [
  { key: 'offer', label: 'عرض خاص', tag: 'تسويقي', tone: 'violet',
    text: 'مرحباً [الاسم]، اشتقنا لزيارتك! خصم 20% على زيارتك القادمة لـ [المركز] صالح لمدة أسبوع. ننتظرك 🎁' },
  { key: 'invoice', label: 'إرسال فاتورة', tag: 'مالي', tone: 'emerald',
    text: 'مرحباً [الاسم]، شكراً لزيارتك [المركز]. فاتورتك جاهزة، يمكنك الاطلاع عليها من الرابط: [الرابط]' },
  { key: 'ready', label: 'السيارة جاهزة', tag: 'تشغيلي', tone: 'blue',
    text: 'مرحباً [الاسم]، سيارتك [السيارة] جاهزة الآن للاستلام في [المركز]. نسعد بخدمتك ✅' },
  { key: 'feedback', label: 'تقييم الخدمة', tag: 'ما بعد الخدمة', tone: 'amber',
    text: 'مرحباً [الاسم]، شكراً لزيارتك [المركز]. يهمنا رأيك — كيف كانت تجربتك معنا اليوم؟' },
  { key: 'custom', label: 'رسالة مخصصة', tag: 'حر', tone: 'slate', text: '' },
];

const TONE = {
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

function inject(text, c, centerName, link) {
  const car = [c?.car_make, c?.car_model].filter(Boolean).join(' ') || 'سيارتك';
  return String(text || '')
    .replaceAll('[الاسم]', c?.full_name || 'عميلنا العزيز')
    .replaceAll('[السيارة]', car)
    .replaceAll('[المركز]', centerName || 'مركزنا')
    .replaceAll('[الرابط]', link || '');
}

export default function MessagesPage() {
  const { t } = useT();
  const { user, centerId, role } = useAuth();
  const myRole = role; // server-resolved from the workers table — never user_metadata
  // centerId is resolved server-side in the dashboard layout and passed through
  // AuthProvider; deriving it from user_metadata let the client pick its own tenant.

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const centerName = selectedId === 'all' ? (primary?.name || 'مركزنا') : (branches.find((b) => b.id === selectedId)?.name || 'مركزنا');

  const { customers, loading } = useCustomers(centerId, selectedId);

  const [tplKey, setTplKey] = useState('offer');
  const [customText, setCustomText] = useState('');
  const [link, setLink] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState({});          // id → true
  const [sending, setSending] = useState(null);      // { done, total }

  const tpl = TEMPLATES.find((t) => t.key === tplKey);
  const baseText = tplKey === 'custom' ? customText : tpl.text;

  const withPhone = useMemo(() => customers.filter((c) => c.phone), [customers]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withPhone;
    return withPhone.filter((c) => (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [withPhone, search]);

  const pickedList = withPhone.filter((c) => picked[c.id]);
  const allPicked = filtered.length > 0 && filtered.every((c) => picked[c.id]);
  const previewC = pickedList[0] || withPhone[0] || null;
  const needsLink = baseText.includes('[الرابط]');

  function togglePick(id) { setPicked((p) => ({ ...p, [id]: !p[id] })); }
  function toggleAll() {
    setPicked((p) => {
      const n = { ...p };
      filtered.forEach((c) => { n[c.id] = !allPicked; });
      return n;
    });
  }

  // Sequential dispatch — one wa.me tab per customer, 900ms apart so the browser
  // and WhatsApp keep up. The counter shows live progress.
  function sendBulk() {
    if (!pickedList.length || !baseText.trim()) return;
    setSending({ done: 0, total: pickedList.length });
    pickedList.forEach((c, i) => {
      setTimeout(() => {
        window.open(waUrl(c.phone, inject(baseText, c, centerName, link)), '_blank');
        setSending((s) => {
          const done = (s?.done || 0) + 1;
          return done >= pickedList.length ? null : { done, total: pickedList.length };
        });
      }, i * 900);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('الرسائل')}</h1>
        <p className="mt-1 text-sm text-slate-500">{centerName} · {t('أرسل العروض والفواتير والتنبيهات لعملائك عبر واتساب — فردي أو جماعي', 'Send offers, invoices and alerts to your customers via WhatsApp — single or bulk')}</p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-5">
        {/* ══ Composer (3/5) ══ */}
        <div className="space-y-5 lg:col-span-3">
          {/* Template picker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-extrabold text-slate-900">نوع الرسالة</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.key} onClick={() => setTplKey(t.key)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${tplKey === t.key ? TONE[t.tone] + ' ring-2 ring-current/10' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                  {t.label} <span className="font-medium opacity-60">· {t.tag}</span>
                </button>
              ))}
            </div>

            {tplKey === 'custom' ? (
              <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={4}
                placeholder="اكتب رسالتك... المتغيرات المتاحة: [الاسم] [السيارة] [المركز] [الرابط]"
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15" />
            ) : (
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-sm font-medium leading-relaxed text-slate-600">{tpl.text}</div>
            )}

            {needsLink && (
              <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder="https://... رابط الفاتورة أو العرض"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">معاينة حيّة</div>
              {previewC && <span className="text-[11px] font-semibold text-slate-400">كما ستصل إلى {previewC.full_name || 'العميل'}</span>}
            </div>
            <div className="mt-3 max-w-md rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm" dir="rtl">
              {baseText.trim() ? inject(baseText, previewC, centerName, link || '[الرابط]') : <span className="text-slate-400">اكتب رسالة لعرض المعاينة...</span>}
            </div>
          </div>

          {/* Dispatch bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-bold text-slate-700">
              {pickedList.length
                ? <>سيتم الإرسال إلى <span className="font-mono tabular-nums text-brand" dir="ltr">{pickedList.length}</span> عميل</>
                : 'اختر العملاء من القائمة المجاورة'}
            </div>
            <button onClick={sendBulk} disabled={!pickedList.length || !baseText.trim() || !!sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#25d366] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-105 disabled:opacity-40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z" /></svg>
              {sending ? `جارٍ الإرسال ${sending.done}/${sending.total}...` : pickedList.length > 1 ? t('إرسال جماعي عبر واتساب', 'Send bulk via WhatsApp') : t('إرسال عبر واتساب', 'Send via WhatsApp')}
            </button>
          </div>
        </div>

        {/* ══ Customer picker (2/5) ══ */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold text-slate-900">العملاء <span className="font-medium text-slate-400">({withPhone.length})</span></div>
              <button onClick={toggleAll} className="text-xs font-extrabold text-brand hover:underline">
                {allPicked ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              </button>
            </div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15" />
          </div>
          <div className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-sm text-slate-400">جاري التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">{search ? 'لا نتائج' : 'لا يوجد عملاء بأرقام جوال بعد — يسجّلهم العامل من لوحته'}</div>
            ) : (
              filtered.map((c) => {
                const on = !!picked[c.id];
                return (
                  <button key={c.id} onClick={() => togglePick(c.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-start transition ${on ? 'bg-brand/5' : 'hover:bg-slate-50'}`}>
                    <span className={`grid h-5 w-5 flex-none place-items-center rounded-md border-2 transition ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white'}`}>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                    </span>
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand text-xs font-extrabold text-white">{(c.full_name || 'ع').charAt(0)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">{c.full_name || '—'}</span>
                      <span className="block text-xs font-semibold text-slate-400" dir="ltr">{c.phone}</span>
                    </span>
                    {(c.total_visits ?? 0) > 0 && <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{c.total_visits} زيارة</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
