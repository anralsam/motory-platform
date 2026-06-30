'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import { workerEmail, workerPassword } from '@/lib/team';
import { roleOf } from '@/lib/roles';
import { TURNSTILE_SITE_KEY, verifyTurnstile } from '@/lib/turnstile';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

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
    attemptsPre: 'محاولات متبقية قبل قفل الحساب: ',
    lockedTitle: 'تم قفل الحساب مؤقتًا',
    lockedMsg: 'تم قفل حسابك بعد تجاوز ١٥ محاولة دخول خاطئة متتالية، حمايةً لك. الحساب الآن قيد المراجعة من فريق الدعم الفني.',
    lockedAction: 'يرجى التواصل مع الدعم الفني لإثبات هويتك وإعادة تفعيل الحساب بعد التأكد من السبب.',
    supportBtn: '✉️ التواصل مع الدعم الفني',
    // ── email 2FA step ──
    otpTitle: 'رمز التحقق',
    otpSub: 'أدخل رمز الـ ٦ أرقام الذي أرسلناه إلى بريدك الإلكتروني.',
    otpCodeLabel: 'رمز التحقق',
    otpVerify: 'تأكيد ودخول', otpVerifying: 'جاري التحقق...',
    otpResend: 'إعادة إرسال الرمز', otpResendIn: 'إعادة الإرسال خلال ',
    otpChange: '‹ تغيير البريد', otpSent: '📩 تم إرسال رمز جديد إلى بريدك.',
    errOtpRequired: 'أدخل رمز التحقق المكوّن من ٦ أرقام.',
    errOtpInvalid: 'الرمز غير صحيح أو منتهي الصلاحية. أعد المحاولة.',
    errOtpSend: 'تعذّر إرسال رمز التحقق. حاول مرة أخرى.',
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
    attemptsPre: 'Attempts left before the account is locked: ',
    lockedTitle: 'Account temporarily locked',
    lockedMsg: 'Your account was locked after 15 consecutive failed sign-in attempts, to protect you. It is now under review by our technical support team.',
    lockedAction: 'Please contact technical support to verify your identity and reactivate the account once the cause is confirmed.',
    supportBtn: '✉️ Contact technical support',
    // ── email 2FA step ──
    otpTitle: 'Verification code',
    otpSub: 'Enter the 6-digit code we sent to your email.',
    otpCodeLabel: 'Verification code',
    otpVerify: 'Verify & sign in', otpVerifying: 'Verifying...',
    otpResend: 'Resend code', otpResendIn: 'Resend in ',
    otpChange: '‹ Change email', otpSent: '📩 A new code was sent to your email.',
    errOtpRequired: 'Enter the 6-digit verification code.',
    errOtpInvalid: 'The code is wrong or expired. Please try again.',
    errOtpSend: 'Could not send the verification code. Try again.',
    forgotNeedEmail: 'Type your email in the field above, then click the link.',
    resetFail: 'Could not send the recovery link. Check the email and try again.',
    resetOk: '📩 We sent a password recovery link to your email.',
  },
};

const EDGE = `${SUPABASE_URL}/functions/v1`;
const SUPPORT_EMAIL = 'support@voldmotor.com';
const OTP_RESEND_SECS = 60;

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

  // ── flow state ──
  // step: 'creds' (email+password) → 'otp' (6-digit email code, 2nd factor)
  const [step, setStep] = useState('creds');
  const [otpEmail, setOtpEmail] = useState('');   // verified email awaiting its code
  const [otpCode, setOtpCode] = useState('');
  const otpRefs = useRef([]);        // refs to the 6 OTP input boxes (for auto-focus)
  const [attemptsLeft, setAttemptsLeft] = useState(null); // remaining tries (from server)
  const [accountLocked, setAccountLocked] = useState(false); // 15-strike server lock
  const [resendIn, setResendIn] = useState(0);

  // resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const maskEmail = (mail) => mail.replace(/(.{2}).*(@.*)/, '$1•••$2');

  // Send (or resend) the Supabase email OTP for the verified account.
  async function sendEmailOtp(email) {
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    return err;
  }

  // STEP 1 — email + password (+ captcha). Email accounts go through the
  // server guard (attempt counter + lock) then the email-OTP second factor.
  // Worker phone/PIN accounts keep the direct password sign-in.
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

    // ── Worker phone/PIN: no email inbox → keep the direct password flow ──
    if (!isEmail) {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: workerEmail(id), password: workerPassword(password),
      });
      if (err) {
        setLoading(false); resetCaptcha();
        setError(/invalid login credentials/i.test(err.message) ? t.errCredPhone : (err.message || t.errGeneric));
        return;
      }
      const role = roleOf(data?.user?.user_metadata?.role);
      router.replace(role === 'technician' ? '/worker-tasks' : redirectTo);
      router.refresh();
      return;
    }

    // ── Email account: server-side guard verifies the password & counts tries ──
    const email = id.toLowerCase();
    let guard;
    try {
      const res = await fetch(`${EDGE}/login-guard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ email, password }),
      });
      guard = await res.json();
    } catch {
      setLoading(false); resetCaptcha(); setError(t.errGeneric); return;
    }

    if (guard?.locked) {
      setLoading(false); resetCaptcha();
      setAccountLocked(true);
      return;
    }
    if (!guard?.passwordValid) {
      setLoading(false); resetCaptcha();
      if (typeof guard?.attemptsLeft === 'number') setAttemptsLeft(guard.attemptsLeft);
      setError(t.errCredEmail);
      return;
    }

    // Password correct → send the email OTP (second factor) and switch step.
    const otpErr = await sendEmailOtp(email);
    if (otpErr) { setLoading(false); resetCaptcha(); setError(t.errOtpSend); return; }
    setOtpEmail(email);
    setAttemptsLeft(null);
    setOtpCode('');
    setStep('otp');
    setResendIn(OTP_RESEND_SECS);
    setLoading(false);
  }

  // STEP 2 — verify the 6-digit email code → this is what creates the session.
  async function onVerifyOtp(e) {
    e.preventDefault();
    setError(''); setNotice('');
    const code = otpCode.replace(/\D/g, '');
    if (code.length !== 6) { setError(t.errOtpRequired); return; }

    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({ email: otpEmail, token: code, type: 'email' });
    if (err) { setLoading(false); setError(t.errOtpInvalid); return; }

    const role = roleOf(data?.user?.user_metadata?.role);
    router.replace(role === 'technician' ? '/worker-tasks' : redirectTo);
    router.refresh();
  }

  async function onResendOtp() {
    if (resendIn > 0 || !otpEmail) return;
    setError(''); setNotice('');
    const err = await sendEmailOtp(otpEmail);
    if (err) { setError(t.errOtpSend); return; }
    setNotice(t.otpSent);
    setResendIn(OTP_RESEND_SECS);
  }

  function backToCreds() {
    setStep('creds'); setOtpCode(''); setError(''); setNotice(''); resetCaptcha();
  }

  // ─── 6-box OTP input behaviour (auto-advance, backspace, paste) ───
  function focusOtpBox(i) {
    const el = otpRefs.current[Math.max(0, Math.min(5, i))];
    if (el) { el.focus(); el.select?.(); }
  }
  function onOtpChange(i, e) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1); // keep only the last typed digit
    setError('');
    setOtpCode((prev) => {
      const arr = prev.split('');
      arr[i] = digit || '';
      return arr.join('').slice(0, 6);
    });
    if (digit && i < 5) focusOtpBox(i + 1);   // auto-advance to next box
  }
  function onOtpKeyDown(i, e) {
    if (e.key === 'Backspace') {
      setError('');
      if (otpCode[i]) {
        setOtpCode((prev) => { const a = prev.split(''); a[i] = ''; return a.join(''); });
      } else if (i > 0) {
        setOtpCode((prev) => { const a = prev.split(''); a[i - 1] = ''; return a.join(''); });
        focusOtpBox(i - 1);                     // backspace on empty → jump back
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusOtpBox(i - 1);
    } else if (e.key === 'ArrowRight' && i < 5) {
      focusOtpBox(i + 1);
    }
  }
  function onOtpPaste(e) {
    e.preventDefault();
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    setError('');
    setOtpCode(digits);
    focusOtpBox(Math.min(digits.length, 6) - 1);  // focus last filled box
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
              <div className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
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
          <Link href="/auth/signup" className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
            {t.signup}
          </Link>
        </div>
      </header>

      {/* centered card */}
      <main className="flex items-start justify-center px-4 pb-16 pt-10 sm:pt-16">
        <div className="w-full max-w-[360px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_40px_-12px_rgba(0,0,0,0.12)] sm:p-7">
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

            {/* ── VIEW 1 · account locked after 15 failed attempts ── */}
            {accountLocked ? (
              <div className="mt-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <h2 className="mt-4 text-base font-extrabold text-gray-900">{t.lockedTitle}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{t.lockedMsg}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{t.lockedAction}</p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-2.5 text-[13px] font-extrabold text-white transition hover:bg-[#1d4ed8]"
                >
                  {t.supportBtn}
                </a>
                <p className="mt-3 text-xs font-medium text-gray-400" dir="ltr">{SUPPORT_EMAIL}</p>
              </div>

            /* ── VIEW 2 · email OTP (second factor) ── */
            ) : step === 'otp' ? (
              <form onSubmit={onVerifyOtp} className="mt-5">
                <button type="button" onClick={backToCreds} className="text-[13px] font-bold text-blue-600 hover:underline">{t.otpChange}</button>

                <div className="mt-5 text-center">
                  <h2 className="text-lg font-extrabold text-gray-900">{t.otpTitle}</h2>
                  <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-gray-500">{t.otpSub}</p>
                  <p dir="ltr" className="mt-1.5 text-[13px] font-bold text-gray-700">{maskEmail(otpEmail)}</p>
                </div>

                <div dir="ltr" onPaste={onOtpPaste} className="flex items-center justify-center gap-3 py-7 sm:gap-3.5">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const filled = Boolean(otpCode[i]);
                    return (
                      <input
                        key={i}
                        ref={(el) => (otpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        maxLength={1}
                        value={otpCode[i] || ''}
                        onChange={(e) => onOtpChange(i, e)}
                        onKeyDown={(e) => onOtpKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`${t.otpCodeLabel} ${i + 1}`}
                        className={`h-16 w-12 rounded-xl border-2 bg-white text-center text-2xl font-extrabold text-zinc-900 caret-blue-600 outline-none transition-all duration-150 sm:w-14 ${
                          filled ? 'border-blue-600 ring-4 ring-blue-100' : 'border-zinc-200 hover:border-zinc-300'
                        } focus:border-blue-600 focus:ring-4 focus:ring-blue-100`}
                      />
                    );
                  })}
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563eb] py-3 text-[13px] font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>
                      {t.otpVerifying}
                    </>
                  ) : t.otpVerify}
                </button>

                <div className="mt-5 text-center">
                  {resendIn > 0 ? (
                    <span className="text-xs font-semibold text-gray-400">{t.otpResendIn}{resendIn}s</span>
                  ) : (
                    <button type="button" onClick={onResendOtp} className="text-xs font-bold text-blue-600 hover:underline">{t.otpResend}</button>
                  )}
                </div>
              </form>

            /* ── VIEW 3 · credentials (email + password + captcha) ── */
            ) : (
              <>
                <form onSubmit={onSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{t.emailLabel}</label>
                    <input
                      type="text" dir="ltr" autoComplete="username"
                      value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t.emailPh}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-left text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-bold text-gray-700">{t.pwLabel}</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} dir="ltr" autoComplete="current-password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.pwPh}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3.5 text-left text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

                  {attemptsLeft !== null && attemptsLeft <= 5 && (
                    <p className="text-center text-xs font-semibold text-amber-600">{t.attemptsPre}{attemptsLeft}</p>
                  )}
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
              </>
            )}
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
