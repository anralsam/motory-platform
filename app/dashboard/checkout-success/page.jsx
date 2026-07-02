'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Centered><div className="text-sm text-slate-400">…</div></Centered>}>
      <CheckoutSuccess />
    </Suspense>
  );
}

function CheckoutSuccess() {
  const params = useSearchParams();
  const bid = params.get('bid');
  const tx = params.get('tx');
  const amt = params.get('amt');
  const [state, setState] = useState('confirming'); // confirming | done | error
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against double-invoke (StrictMode)
    ran.current = true;
    (async () => {
      if (!bid) { setState('error'); return; }
      try {
        // Simulate the gateway → webhook callback (here we self-confirm with the owner's
        // session JWT; in production the gateway calls the webhook with the shared secret).
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/payment-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + (session?.access_token || ''),
          },
          body: JSON.stringify({ billing_id: bid, transaction_id: tx, status: 'paid' }),
        });
        const j = await res.json().catch(() => ({}));
        setState(res.ok && j.ok ? 'done' : 'error');
      } catch (e) {
        setState('error');
      }
    })();
  }, [bid, tx]);

  if (state === 'confirming') {
    return (
      <Centered>
        <svg className="animate-spin text-violet-600" width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">جارٍ تأكيد عملية الدفع…</h1>
        <p className="mt-1 text-sm text-slate-500">لحظات ونؤكد سداد مستحقاتك.</p>
      </Centered>
    );
  }

  if (state === 'error') {
    return (
      <Centered>
        <div className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-500">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">تعذّر تأكيد الدفع</h1>
        <p className="mt-1 text-sm text-slate-500">لم نتمكن من تأكيد العملية. حاول مرة أخرى من صفحة الفواتير.</p>
        <Link href="/dashboard/invoices" className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">العودة للفواتير</Link>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">تم السداد بنجاح</h1>
      <p className="mt-1 text-sm text-slate-500">شكراً لك — تم تسديد مستحقات منصة VOLD MOTOR.</p>
      {amt ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
          <div className="text-xs font-bold text-slate-500">المبلغ المدفوع</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">{Number(amt).toLocaleString('en')} <span className="text-sm">⃁</span></div>
          {tx ? <div className="ltr mt-1 font-mono text-[11px] text-slate-400">{tx}</div> : null}
        </div>
      ) : null}
      <Link href="/dashboard/invoices" className="mt-6 rounded-xl bg-brand px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark">العودة للفواتير</Link>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}
