'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import Logo from '@/components/Logo';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';
import { CATS } from '@/lib/centerTypes';
import { TURNSTILE_SITE_KEY, verifyTurnstile } from '@/lib/turnstile';

const CENTER_TYPES = Object.keys(CATS); // canonical taxonomy (single source of truth)

/* Bilingual copy — the language switcher flips the whole page live. */
const STRINGS = {
  ar: {
    signin: 'تسجيل الدخول',
    title: 'تسجيل مركز جديد', subtitle: 'بدون اشتراك شهري · عمولة رمزية على الطلبات المنجزة.',
    shopLabel: 'اسم المركز', shopPh: '',
    typeLabel: 'نوع النشاط', typePh: 'اختر نوع النشاط', errType: 'الرجاء اختيار نوع النشاط.',
    ownerLabel: 'اسم المالك', ownerPh: '',
    phoneLabel: 'رقم الجوال', phonePh: '',
    emailLabel: 'البريد الإلكتروني', emailPh: '',
    pwLabel: 'كلمة المرور', pwPh: '',
    submit: 'تسجيل المركز', loading: 'جاري الإرسال...',
    haveAccount: 'لديك حساب بالفعل؟', signinLink: 'تسجيل الدخول',
    doneTitle: 'تم استلام طلبك 🎉',
    doneBody: 'طلب تسجيل مركزك قيد المراجعة. سنرسل لك بريدًا فور اعتماد الحساب، وبعدها تقدر تسجّل الدخول مباشرة.',
    doneCta: 'الذهاب لتسجيل الدخول',
    termsPre: 'بالمتابعة، أنت توافق على ', terms: 'شروط الاستخدام', tj1: '، و', privacy: 'سياسة الخصوصية',
    tj2: '، و', cookies: 'سياسة ملفات تعريف الارتباط', termsEnd: ' الخاصة بـ VOLD MOTOR.',
    errShop: 'الرجاء إدخال اسم المركز.', errPhone: 'الرجاء إدخال رقم الجوال.',
    errEmail: 'البريد الإلكتروني غير صحيح.', errPw: 'كلمة المرور يجب أن تكون ٨ خانات على الأقل.',
    errPwWeak: 'كلمة المرور لا تستوفي جميع الشروط المطلوبة.',
    pwReqTitle: 'يجب أن تحتوي كلمة المرور على:',
    pwLen: '٨ خانات على الأقل', pwUpper: 'حرف كبير (A–Z)', pwLower: 'حرف صغير (a–z)',
    pwNum: 'رقم واحد على الأقل (٠–٩)', pwSpecial: 'رمز خاص (‎!@#$…)',
    errCaptcha: 'الرجاء إكمال التحقق «أنا لست روبوتًا».',
    errHuman: 'فشل التحقق البشري. حدّث الصفحة وحاول مرة أخرى.',
    errSubmit: 'تعذّر إرسال الطلب. حاول مرة أخرى.', errConn: 'تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مجددًا.',
  },
  en: {
    signin: 'Sign in',
    title: 'Register a new center', subtitle: 'No monthly fees · a small commission on completed orders.',
    shopLabel: 'Center name', shopPh: '',
    typeLabel: 'Business type', typePh: 'Select business type', errType: 'Please choose a business type.',
    ownerLabel: 'Owner name', ownerPh: '',
    phoneLabel: 'Phone number', phonePh: '',
    emailLabel: 'Email', emailPh: '',
    pwLabel: 'Password', pwPh: '',
    submit: 'Register center', loading: 'Submitting...',
    haveAccount: 'Already have an account?', signinLink: 'Sign in',
    doneTitle: 'Request received 🎉',
    doneBody: "Your center registration is under review. We'll email you as soon as it's approved, then you can sign in.",
    doneCta: 'Go to sign in',
    termsPre: "By continuing, I agree to VOLD MOTOR's ", terms: 'terms', tj1: ', ', privacy: 'privacy policy',
    tj2: ', and ', cookies: 'cookie policy', termsEnd: '.',
    errShop: 'Please enter the center name.', errPhone: 'Please enter the phone number.',
    errEmail: 'Invalid email address.', errPw: 'Password must be at least 8 characters.',
    errPwWeak: 'Password does not meet all requirements.',
    pwReqTitle: 'Password must contain:',
    pwLen: 'At least 8 characters', pwUpper: 'An uppercase letter (A–Z)', pwLower: 'A lowercase letter (a–z)',
    pwNum: 'At least one number (0–9)', pwSpecial: 'A special character (!@#$…)',
    errCaptcha: 'Please complete the “I am human” check.',
    errHuman: 'Human verification failed. Refresh the page and try again.',
    errSubmit: 'Could not submit the request. Try again.', errConn: 'Could not reach the server. Check your connection and retry.',
  },
};

export default function SignUpPage() {
  const [lang, setLang] = useState('ar');
  const [langOpen, setLangOpen] = useState(false);
  const t = STRINGS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [form, setForm] = useState({ shop_name: '', owner_name: '', phone: '', email: '', password: '', center_type: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  // ── Live password-strength conditions ──
  const pwChecks = useMemo(() => {
    const p = form.password;
    return {
      len: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      num: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
    };
  }, [form.password]);
  const pwAllOk = Object.values(pwChecks).every(Boolean);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef(null);
  const resetCaptcha = () => { setCaptchaToken(''); turnstileRef.current?.reset(); };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const shop = form.shop_name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!shop) return setError(t.errShop);
    if (!form.center_type) return setError(t.errType);
    if (!phone) return setError(t.errPhone);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t.errEmail);
    if (!pwAllOk) return setError(t.errPwWeak);
    if (!captchaToken) return setError(t.errCaptcha);

    setLoading(true);
    const human = await verifyTurnstile(captchaToken);
    if (!human.ok) { setLoading(false); resetCaptcha(); return setError(t.errHuman); }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/merchant-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          shop_name: shop,
          owner_name: form.owner_name.trim() || shop,
          commercial_reg: null,
          location: null,
          phone,
          email,
          password: form.password,
          services: [form.center_type],
        }),
      });
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok || !data.success) { resetCaptcha(); return setError(data.error || t.errSubmit); }
      setDone(true);
    } catch {
      setLoading(false); resetCaptcha(); setError(t.errConn);
    }
  }

  // Remove hard-coded text-left so RTL parent direction is respected naturally.
  const inputCls = 'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  const labelCls = 'mb-1.5 block text-[13px] font-bold text-gray-700';

  return (
    <div dir={dir} className="min-h-screen bg-[#fafafa] text-gray-900 antialiased">
      {/* top bar — brand left · language switcher + sign-in right */}
      <header dir="ltr" className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" aria-label="VOLD MOTOR"><Logo className="h-7 w-auto text-zinc-900" /></Link>
        <div className="flex items-center gap-3">
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
          <Link href="/auth/signin" className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
            {t.signin}
          </Link>
        </div>
      </header>

      <main className="flex items-start justify-center px-4 pb-16 pt-8 sm:pt-12">
        <div className="w-full max-w-[360px]">
          {done ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_40px_-12px_rgba(0,0,0,0.12)]">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 className="mt-4 text-xl font-extrabold text-gray-900">{t.doneTitle}</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{t.doneBody}</p>
              <Link href="/auth/signin" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#2563eb] py-2.5 text-[13px] font-extrabold text-white transition hover:bg-[#1d4ed8]">
                {t.doneCta}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_40px_-12px_rgba(0,0,0,0.12)] sm:p-7">
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{t.title}</h1>
              <p className="mt-1 text-[13px] text-gray-500">{t.subtitle}</p>

              {error && (() => {
                const alreadyRegistered = error.includes('مسجّل بالفعل');
                const boxCls = 'mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700';
                const icon = (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 flex-none"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                );
                if (alreadyRegistered) {
                  // Turn the alert into a clickable CTA that routes to the sign-in page.
                  const ctaText = error.replace('هل تريد تسجيل الدخول؟', 'اضغط هنا لتسجيل الدخول');
                  return (
                    <Link href="/auth/signin" className={`${boxCls} cursor-pointer transition hover:border-red-300 hover:bg-red-100`}>
                      {icon}
                      <span>{ctaText}</span>
                    </Link>
                  );
                }
                return (
                  <div className={boxCls}>
                    {icon}
                    <span>{error}</span>
                  </div>
                );
              })()}

              <form onSubmit={onSubmit} dir={dir} className="mt-5 space-y-3.5">
                {/* اسم المركز — inherits dir from form */}
                <div>
                  <label className={labelCls}>{t.shopLabel}</label>
                  <input type="text" value={form.shop_name} onChange={set('shop_name')} placeholder={t.shopPh} className={inputCls} />
                </div>

                {/* نوع النشاط — custom select with direction-aware arrow */}
                <div>
                  <label className={labelCls}>{t.typeLabel}</label>
                  <div className="relative">
                    <select
                      dir={dir}
                      value={form.center_type}
                      onChange={set('center_type')}
                      className={`${inputCls} appearance-none ${dir === 'rtl' ? 'pl-9 pr-3.5' : 'pr-9 pl-3.5'} ${form.center_type ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                      <option value="" disabled>{t.typePh}</option>
                      {CENTER_TYPES.map((ct) => <option key={ct} value={ct} className="text-gray-900">{ct}</option>)}
                    </select>
                    {/* Arrow sits at the logical END: left for RTL, right for LTR */}
                    <span className={`pointer-events-none absolute inset-y-0 ${dir === 'rtl' ? 'left-3' : 'right-3'} flex items-center text-gray-400`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                    </span>
                  </div>
                </div>

                {/* اسم المالك — inherits dir from form */}
                <div>
                  <label className={labelCls}>{t.ownerLabel}</label>
                  <input type="text" value={form.owner_name} onChange={set('owner_name')} placeholder={t.ownerPh} className={inputCls} />
                </div>

                {/* رقم الجوال — always LTR (numeric) */}
                <div>
                  <label className={labelCls}>{t.phoneLabel}</label>
                  <input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder={t.phonePh} className={`${inputCls} text-left`} />
                </div>

                {/* البريد الإلكتروني — always LTR */}
                <div>
                  <label className={labelCls}>{t.emailLabel}</label>
                  <input type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set('email')} placeholder={t.emailPh} className={`${inputCls} text-left`} />
                </div>

                {/* كلمة المرور — always LTR, eye-toggle at left (logical end for both RTL+LTR) */}
                <div>
                  <label className={labelCls}>{t.pwLabel}</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} dir="ltr" autoComplete="new-password" value={form.password} onChange={set('password')} onFocus={() => setPwFocused(true)} placeholder={t.pwPh} className={`${inputCls} pl-10 text-left`} />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 left-2 my-auto grid h-8 w-8 place-items-center rounded-md text-gray-400 transition hover:text-gray-700" aria-label="show password">
                      {showPw ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>

                  {/* Live password conditions — appear once the field is touched */}
                  {(pwFocused || form.password) && (
                    <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
                      <p className="mb-1.5 text-[11px] font-bold text-gray-500">{t.pwReqTitle}</p>
                      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {[
                          [pwChecks.len, t.pwLen],
                          [pwChecks.upper, t.pwUpper],
                          [pwChecks.lower, t.pwLower],
                          [pwChecks.num, t.pwNum],
                          [pwChecks.special, t.pwSpecial],
                        ].map(([ok, label], i) => (
                          <li key={i} className={`flex items-center gap-1.5 text-[11.5px] font-semibold transition-colors ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {ok ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="flex-none"><path d="M20 6 9 17l-5-5" /></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="flex-none"><circle cx="12" cy="12" r="9" /></svg>
                            )}
                            <span>{label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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

              <p className="mt-6 text-center text-sm text-gray-500">
                {t.haveAccount}{' '}
                <Link href="/auth/signin" className="font-bold text-blue-600 hover:underline">{t.signinLink}</Link>
              </p>
            </div>
          )}

          {!done && (
            <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
              {t.termsPre}
              <a href="#" className="underline hover:text-gray-600">{t.terms}</a>{t.tj1}
              <a href="#" className="underline hover:text-gray-600">{t.privacy}</a>{t.tj2}
              <a href="#" className="underline hover:text-gray-600">{t.cookies}</a>{t.termsEnd}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
