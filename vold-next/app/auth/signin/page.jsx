'use client';
import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { workerEmail, workerPassword } from '@/lib/team';
import { roleOf } from '@/lib/roles';
import { TURNSTILE_SITE_KEY, verifyTurnstile } from '@/lib/turnstile';

/* Bilingual copy — the language switcher flips the whole login page live. */
const STRINGS = {
  ar: {
    title: 'تسجيل الدخول', subtitle: 'ادخل إلى لوحة تحكم مركزك', signup: 'سجّل مركزك',
    emailLabel: 'البريد الإلكتروني', emailPh: '',
    pwLabel: 'كلمة المرور', pwPh: '',
    submit: 'تسجيل الدخول', loading: 'جاري الدخول...',
    noAccount: 'ليس لديك حساب؟', signupLink: 'سجّل مركزك',
    forgotPre: 'هل نسيت ', fEmail: 'بريدك', forgotOr: ' أو ', fPw: 'كلمة المرور', forgotEnd: '؟',
    termsPre: 'بالمتابعة، أنت توافق على ', terms: 'شروط الاستخدام', tj1: '، و', privacy: 'سياسة الخصوصية',
    tj2: '، و', cookies: 'سياسة ملفات تعريف الارتباط', termsEnd: ' الخاصة بـ VOLD MOTOR.',
    errFields: 'الرجاء إدخال البريد وكلمة المرور.',
    errCaptcha: 'الرجاء إكمال التحقق «أنا لست روبوتًا».',
    errHuman: 'فشل التحقق البشري. حدّث الصفحة وحاول مرة أخرى.',
    errCredEmail: 'البريد أو كلمة المرور غير صحيحة.', errCredPhone: 'رقم الجوال أو الرمز السري غير صحيح.',
    errUnconfirmed: 'لم يتم تأكيد الحساب بعد.', errGeneric: 'تعذّر تسجيل الدخول.',
    forgotNeedEmail: 'اكتب بريدك الإلكتروني في الحقل أعلاه ثم اضغط على الرابط.',
    resetFail: 'تعذّر إرسال رابط الاستعادة. تأكد من البريد وحاول مجددًا.',
    resetOk: '📩 أرسلنا رابط استعادة كلمة المرور إلى بريدك.',
  },
  en: {
    title: 'Sign in', subtitle: 'Sign in to your center dashboard', signup: 'Sign up',
    emailLabel: 'Email', emailPh: '',
    pwLabel: 'Password', pwPh: '',
    submit: 'Sign in', loading: 'Signing in...',
    noAccount: "Don't have an account?", signupLink: 'Sign up',
    forgotPre: 'Forgot your ', fEmail: 'email', forgotOr: ' or ', fPw: 'password', forgotEnd: '?',
    termsPre: "By continuing, I agree to VOLD MOTOR's ", terms: 'terms', tj1: ', ', privacy: 'privacy policy',
    tj2: ', and ', cookies: 'cookie policy', termsEnd: '.',
    errFields: 'Please enter your email and password.',
    errCaptcha: 'Please complete the “I am human” check.',
    errHuman: 'Human verification failed. Refresh the page and try again.',
    errCredEmail: 'Incorrect email or password.', errCredPhone: 'Incorrect phone number or PIN.',
    errUnconfirmed: 'Account is not confirmed yet.', errGeneric: 'Could not sign in.',
    forgotNeedEmail: 'Type your email in the field above, then click the link.',
    resetFail: 'Could not send the recovery link. Check the email and try again.',
    resetOk: '📩 We sent a password recovery link to your email.',
  },
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fafafa]" />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/dashboard';

  const [lang, setLang] = useState('ar');
  const [langOpen, setLangOpen] = useState(false);
  const t = STRINGS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef(null);
  const resetCaptcha = () => { setCaptchaToken(''); turnstileRef.current?.reset(); };

  async function onSubmit(e) {
    e.preventDefault();
    setError(''); setNotice('');
    const id = identifier.trim();
    if (!id || !password) { setError(t.errFields); return; }
    if (!captchaToken) { setError(t.errCaptcha); return; }

    setLoading(true);
    const human = await verifyTurnstile(captchaToken);
    if (!human.ok) { setLoading(false); resetCaptcha(); setError(t.errHuman); return; }

    const isEmail = id.includes('@');
    const loginEmail = isEmail ? id.toLowerCase() : workerEmail(id);
    const loginPassword = isEmail ? password : workerPassword(password);

    const { data, error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (err) {
      setLoading(false); resetCaptcha();
      const msg = /invalid login credentials/i.test(err.message) ? (isEmail ? t.errCredEmail : t.errCredPhone)
        : /email not confirmed/i.test(err.message) ? t.errUnconfirmed
        : err.message || t.errGeneric;
      setError(msg);
      return;
    }
    const role = roleOf(data?.user?.user_metadata?.role);
    const dest = role === 'technician' ? '/worker-tasks' : redirectTo;
    router.replace(dest);
    router.refresh();
  }

  async function onForgot(e) {
    e?.preventDefault();
    setError(''); setNotice('');
    const id = identifier.trim().toLowerCase();
    if (!id.includes('@')) { setError(t.forgotNeedEmail); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(id, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/signin` : undefined,
    });
    if (err) { setError(t.resetFail); return; }
    setNotice(t.resetOk);
  }

  const linkCls = 'font-medium text-blue-600 hover:underline';

  return (
    <div dir={dir} className="min-h-screen bg-[#fafafa] text-gray-900 antialiased">
      {/* top bar — brand left · language switcher + register right (mirrors the reference) */}
      <header dir="ltr" className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" aria-label="VOLD MOTOR"><Logo className="h-7 w-auto text-zinc-900" /></Link>
        <div className="flex items-center gap-3">
          {/* language switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((o) => !o)}
              onBlur={() => setTimeout(() => setLangOpen(false), 150)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-gray-600 transition hover:bg-gray-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" /></svg>
              {lang === 'ar' ? 'العربية' : 'English'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {[['ar', 'العربية'], ['en', 'English']].map(([code, label]) => (
                  <button
                    key={code}
                    onMouseDown={(ev) => { ev.preventDefault(); setLang(code); setLangOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm font-bold transition hover:bg-gray-50 ${lang === code ? 'text-blue-600' : 'text-gray-700'}`}
                  >
                    {label}
                    {lang === code && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link href="/auth/signup" className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
            {t.signup}
          </Link>
        </div>
      </header>

      {/* centered card */}
      <main className="flex items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
        <div className="w-full max-w-[360px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_40px_-12px_rgba(0,0,0,0.12)] sm:p-7">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{t.title}</h1>
            <p className="mt-1 text-[13px] text-gray-500">{t.subtitle}</p>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 flex-none"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-700">{notice}</div>
            )}

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{t.emailLabel}</label>
                <input
                  type="text" dir="ltr" autoComplete="username"
                  value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.emailPh}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-left text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{t.pwLabel}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} dir="ltr" autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.pwPh}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3.5 text-left text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 left-2 my-auto grid h-8 w-8 place-items-center rounded-md text-gray-400 transition hover:text-gray-700" aria-label="show password">
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{ theme: 'light', size: 'normal', language: lang }}
                  onSuccess={setCaptchaToken}
                  onExpire={resetCaptcha}
                  onError={resetCaptcha}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-2.5 text-[13px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
                    {t.loading}
                  </>
                ) : t.submit}
              </button>
            </form>

            {/* footer links (mirror the reference) */}
            <div className="mt-6 space-y-1.5 text-center text-sm text-gray-500">
              <p>
                {t.noAccount}{' '}
                <Link href="/auth/signup" className="font-bold text-blue-600 hover:underline">{t.signupLink}</Link>
              </p>
              <p>
                {t.forgotPre}
                <button onClick={onForgot} className={linkCls}>{t.fEmail}</button>
                {t.forgotOr}
                <button onClick={onForgot} className={linkCls}>{t.fPw}</button>
                {t.forgotEnd}
              </p>
            </div>
          </div>

          {/* terms note under the card */}
          <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
            {t.termsPre}
            <a href="#" className="underline hover:text-gray-600">{t.terms}</a>{t.tj1}
            <a href="#" className="underline hover:text-gray-600">{t.privacy}</a>{t.tj2}
            <a href="#" className="underline hover:text-gray-600">{t.cookies}</a>{t.termsEnd}
          </p>
        </div>
      </main>
    </div>
  );
}
