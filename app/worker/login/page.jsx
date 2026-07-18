'use client';

/**
 * /worker/login?token=VOLD-W-XXXX — the standalone worker auth gate.
 * Captures the magic token, redeems it server-side for a REAL Supabase session,
 * then redirects into the cockpit. Renders a clean, isolated full-screen shell
 * (no merchant chrome). A blocked/deleted/expired worker gets a clear wall.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { redeemWorkerToken } from '@/app/worker/actions';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState('working'); // working | error
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) { if (alive) { setState('error'); setMsg('رابط الدخول ناقص'); } return; }
      const res = await redeemWorkerToken(token);
      if (!alive) return;
      if (res?.ok) router.replace('/worker/dashboard');
      else { setState('error'); setMsg(res?.error || 'تعذّر تسجيل الدخول'); }
    })();
    return () => { alive = false; };
  }, [token, router]);

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-2xl font-black tracking-tight text-white">VOLD <span className="text-blue-500">MOTOR</span></div>
        {state === 'working' ? (
          <>
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-blue-500" />
            <p className="text-sm font-bold text-slate-300">جارٍ التحقق من رابط الدخول…</p>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </div>
            <h1 className="text-lg font-black text-white">تعذّر الدخول</h1>
            <p className="mt-2 text-sm font-medium text-slate-300">{msg}</p>
            <p className="mt-4 text-xs text-slate-500">اطلب من مركزك إرسال رابط دخول جديد.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function WorkerLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LoginInner />
    </Suspense>
  );
}
