'use client';

/**
 * AutomationHub — "مركز إدارة أتمتة رسائل الـ WhatsApp".
 * A clinical permission matrix of toggle rows that switch each automation trigger
 * ON/OFF for the merchant. Reads the merchant's row (RLS owner-only); writes go
 * through the gated setAutomation server action with optimistic local state.
 * YouTube-Studio tokens · bold headers · slate-500 secondary · RTL.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { setAutomation } from '@/app/dashboard-pro/actions';
import { AUTOMATIONS, AUTOMATION_DEFAULTS } from '@/lib/whatsapp';

export default function AutomationHub({ centerId, showToast }) {
  const [flags, setFlags] = useState(AUTOMATION_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!centerId) { setLoading(false); return; }
      const { data } = await supabase.from('whatsapp_automations').select('*').eq('merchant_id', centerId).maybeSingle();
      if (alive) { if (data) setFlags({ ...AUTOMATION_DEFAULTS, ...data }); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [centerId]);

  async function toggle(key) {
    const next = !flags[key];
    const prev = flags;
    setFlags((f) => ({ ...f, [key]: next }));
    const r = await setAutomation(key, next);
    if (!r?.ok) { setFlags(prev); showToast?.(r?.error || 'تعذّر الحفظ', 'error'); }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">مركز إدارة أتمتة رسائل الـ WhatsApp</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">فعّل أو عطّل المحفّزات التي تُرسل تلقائياً عبر واتساب عند أحداث الورشة.</p>

      <div className="mt-6 divide-y divide-slate-100">
        {AUTOMATIONS.map((a) => {
          const on = !!flags[a.key];
          return (
            <div key={a.key} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900">{a.label}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-500">{a.hint}</div>
                {a.msg && <div className="mt-2 inline-block rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">«{a.msg}»</div>}
              </div>
              <button onClick={() => toggle(a.key)} disabled={loading} role="switch" aria-checked={on} aria-label={a.label}
                className={`relative mt-0.5 h-6 w-11 flex-none rounded-full transition-colors duration-200 disabled:opacity-50 ${on ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-0.5' : 'left-[22px]'}`} />
              </button>
            </div>
          );
        })}

        {/* Delivery mode — official Cloud API vs manual wa.me safety net */}
        <div className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900">استخدام الروابط اليدوية (وضع احتياطي)</div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">عند التفعيل، يعرض النظام زرّ واتساب يدوي للفنّي بدل الإرسال التلقائي من رقم المركز الرسمي.</div>
          </div>
          <button onClick={() => toggle('use_fallback_links')} disabled={loading} role="switch" aria-checked={!!flags.use_fallback_links} aria-label="الوضع الاحتياطي"
            className={`relative mt-0.5 h-6 w-11 flex-none rounded-full transition-colors duration-200 disabled:opacity-50 ${flags.use_fallback_links ? 'bg-blue-600' : 'bg-slate-200'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${flags.use_fallback_links ? 'left-0.5' : 'left-[22px]'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
