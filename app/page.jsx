'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

/* ──────────────────────────────────────────────────────────────────────────
   VOLD MOTOR — Landing Page
   Ultra-premium B2B SaaS aesthetic (Stripe / Vercel / Linear).
   Pure-black canvas · faint grid · soft top glow · gradient headline ·
   glassmorphism hero preview with 3D tilt + bottom mask · code-based Bento grid.
   No images. No generic vectors. Every visual is Tailwind-coded.
   ────────────────────────────────────────────────────────────────────────── */

function FadeIn({ children, delay = 0, y = 18, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── On-load entrance — staggered fade-in-up for the hero (plays on mount,
   not on scroll). Smooth, fast (0.5s), ease-out. No bounce. ── */
function HeroIn({ children, delay = 0, y = 20, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── VOLD MOTOR wordmark — dark-mode variant (white text, transparent) ── */
function Logo({ className = 'h-7 w-auto' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-white.png" alt="VOLD MOTOR" className={className} />;
}

/* ── Hero app preview (mirrors the real dashboard) ── */
function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0c0c0e]">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="mx-auto rounded-md bg-white/5 px-3 py-0.5 text-[10px] font-medium text-white/40">app.voldmotor.com/dashboard</span>
      </div>
      <div className="grid grid-cols-[150px_1fr]">
        {/* sidebar */}
        <div className="hidden border-s border-white/10 bg-white/[0.02] p-3 sm:block">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-zinc-800 bg-zinc-900">
              <svg width="14" height="14" viewBox="0 0 48 48" fill="none"><path d="M6 10 L24 42 L42 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <div className="h-2 w-14 rounded bg-white/15" />
          </div>
          {['الرئيسية', 'الطلبات', 'العملاء', 'المخزون', 'التقارير', 'الفواتير'].map((t, i) => (
            <div key={i} className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-zinc-800' : ''}`}>
              <span className={`h-2.5 w-2.5 rounded ${i === 0 ? 'bg-white' : 'bg-white/15'}`} />
              <span className={`text-[10px] font-bold ${i === 0 ? 'text-white' : 'text-white/40'}`}>{t}</span>
            </div>
          ))}
        </div>
        {/* main */}
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold text-white/80">مساء الخير 👋</div>
              <div className="text-[9px] text-white/30">نظرة سريعة على أداء كل الفروع</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white/50">🏢 كل الفروع</div>
          </div>
          {/* KPIs */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['سيارات اليوم', '18', 'text-white'], ['دخل اليوم', '4,250', 'text-white'], ['العملاء', '312', 'text-white'], ['الإنجاز', '60%', 'text-white']].map(([l, v, c], i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <div className="text-[8px] text-white/40">{l}</div>
                <div className={`mt-0.5 text-[13px] font-extrabold ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          {/* chart */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 text-[9px] font-bold text-white/50">أداء آخر 7 أيام</div>
            <div className="flex h-20 items-end gap-1.5">
              {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                <div key={i} className="flex-1 rounded-t border-x border-t border-zinc-800/60 bg-gradient-to-t from-slate-900 to-slate-800" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BENTOS = [
  { key: 'pos', tag: 'الاستقبال', title: 'لوحة الاستقبال الذكية', desc: 'استقبل السيارة وأسندها لفني في ثوانٍ — بقراءة لوحة سعودية حقيقية.' },
  { key: 'kanban', tag: 'العمليات', title: 'لوحة الفنيين اللحظية', desc: 'تابع كل سيارة من قيد الانتظار حتى التسليم، بسحب وإفلات.' },
  { key: 'reports', tag: 'التقارير', title: 'تقارير لحظية', desc: 'إيرادك وإشغالك ونموّك في رسوم بيانية حيّة تتحدث عن نفسها.' },
  { key: 'invoice', tag: 'الفوترة', title: 'فواتير ZATCA إلكترونية', desc: 'فاتورة ضريبية متوافقة برمز QR تُرسل للعميل عبر واتساب.' },
];

export default function LandingPage() {
  // Auth-aware CTAs: detect an active session and adapt label + route.
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setAuthed(!!data?.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session?.user));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const appHref = authed ? '/dashboard' : '/auth/signin';
  // Registration CTAs route to the signup page when logged out; to the dashboard when in.
  const registerHref = authed ? '/dashboard' : '/auth/signup';
  const loginLabel = authed ? 'العودة للوحة التحكم' : 'تسجيل الدخول';
  const heroCtaLabel = authed ? 'فتح لوحة التحكم' : 'ابدأ تجربة المركز';
  const finalCtaLabel = authed ? 'فتح لوحة التحكم' : 'ابدأ تجربة المركز';
  const navStartLabel = authed ? 'لوحة التحكم' : 'ابدأ الآن';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] font-sans text-white antialiased">
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, #000 50%, transparent 100%)',
        }}
      />
      {/* soft diffused top glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{ background: 'radial-gradient(60% 50% at 50% -8%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%)' }}
      />

      <div className="relative">
        {/* Nav */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center" aria-label="VOLD MOTOR">
            <Logo className="h-7 w-auto text-white" />
          </Link>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-light text-zinc-400 transition hover:text-white">المزايا</a>
            <a href="#pricing" className="text-sm font-light text-zinc-400 transition hover:text-white">الأسعار</a>
            <a href="#faq" className="text-sm font-light text-zinc-400 transition hover:text-white">الأسئلة الشائعة</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href={appHref} className="rounded-lg px-3 py-2 text-sm font-light text-zinc-400 transition hover:text-white">{loginLabel}</Link>
            <Link href={registerHref} className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a] transition hover:bg-zinc-200">{navStartLabel}</Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="mx-auto max-w-3xl px-5 pt-12 text-center sm:pt-20">
          <HeroIn delay={0.05}>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" /> نظام تشغيل متكامل لمراكز العناية بالسيارات
            </div>
          </HeroIn>
          <HeroIn delay={0.15}>
            <h1 className="text-balance bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text pb-2 text-5xl font-extrabold leading-tight tracking-tight text-transparent md:text-7xl">
              نظام التشغيل المتكامل<br />لمراكز العناية بالسيارات
            </h1>
          </HeroIn>
          <HeroIn delay={0.3}>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-zinc-400 md:text-xl">
              تحكم كامل في عمليات مركزك، من استقبال العميل وحتى إصدار الفاتورة الضريبية — في واجهة واحدة.
            </p>
          </HeroIn>
          <HeroIn delay={0.45}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={registerHref}
                className="w-full rounded-xl bg-white px-6 py-3 text-sm font-medium text-[#0a0a0a] transition hover:bg-zinc-100 sm:w-auto"
              >
                {heroCtaLabel}
              </Link>
              <Link href="#features" className="w-full rounded-xl border border-zinc-800 px-6 py-3 text-sm font-light text-zinc-400 transition hover:border-zinc-700 hover:text-white sm:w-auto">
                استكشف المنصة
              </Link>
            </div>
          </HeroIn>
          <HeroIn delay={0.6}>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-light text-zinc-500">
              <span>★ 4.9/5</span>
              <span className="text-zinc-700">·</span>
              <span>يثق بنا أكثر من +400 مركز شريك</span>
            </div>
          </HeroIn>
        </header>

        {/* Hero glass mockup — 3D tilt + bottom mask */}
        <FadeIn delay={0.25} y={30}>
          <div className="relative mx-auto mt-14 max-w-5xl px-5 sm:mt-20">
            <div
              className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-2 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,white_60%,transparent)]"
              style={{ transform: 'perspective(1200px) rotateX(1.5deg) scale(0.98)' }}
            >
              <HeroPreview />
            </div>
          </div>
        </FadeIn>

        {/* ════ Bento grid — features ════ */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-24">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-zinc-600">THE PLATFORM</div>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">
                منصة واحدة · أربع قوى
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm font-light leading-relaxed text-zinc-400">كل ما يحتاجه مركزك في لوحة واحدة متكاملة — من الاستقبال حتى الفاتورة.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {BENTOS.map((b, i) => (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-full min-h-[200px] flex-col justify-center rounded-2xl border border-white/10 bg-zinc-900/50 p-8 transition-colors duration-300 hover:border-white/20"
              >
                <div className="text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-600">{b.tag}</div>
                <h3 className="mt-3 text-base font-medium tracking-tight text-white">{b.title}</h3>
                <p className="mt-1.5 text-sm font-light leading-relaxed text-zinc-400">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════ Pricing ════ */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-zinc-600">PRICING</div>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">
                ادفع فقط لمّا تكسب
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm font-light leading-relaxed text-zinc-400">
                بدون اشتراك شهري. عمولة رمزية على العمليات المكتملة فقط — مصلحتنا مرتبطة بنجاحك.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <FadeIn>
              <ul className="space-y-5">
                {[
                  'لا رسوم شهرية ثابتة — أبداً',
                  'عمولة واضحة تُدفع فقط عند إتمام العملية',
                  'تُحسب فقط على العمليات المكتملة',
                  'جميع المزايا مفتوحة بلا حدود',
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    <span className="text-sm font-light text-zinc-400">{t}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.08}>
              <div className="rounded-2xl border border-zinc-800 bg-[#121212] p-8">
                <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-500">بدون اشتراك شهري</span>
                <div className="mt-6 flex items-end gap-2" dir="rtl">
                  <span className="text-5xl font-medium leading-none text-white">٠</span>
                  <span className="mb-0.5 text-base font-light text-zinc-500">ريال شهرياً</span>
                </div>
                <p className="mt-1 text-right text-sm font-light text-zinc-600">دائماً وأبداً — مهما كبر مركزك</p>
                <div className="my-6 border-t border-zinc-800" />
                <p className="text-sm font-light leading-relaxed text-zinc-400">
                  إذا ربحت، تدفع عمولة رمزية فقط. ما ربحت؟ ما تدفع شيء.
                </p>
                <p className="mt-2 text-xs font-light leading-relaxed text-zinc-600">
                  تفاصيل العمولة الكاملة تظهر لك بشفافية عند تسجيل مركزك.
                </p>
                <Link href={registerHref} className="mt-6 flex w-full items-center justify-center rounded-xl bg-white py-3 text-sm font-medium text-[#0a0a0a] transition hover:bg-zinc-100">
                  {heroCtaLabel}
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ════ FAQ ════ */}
        <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
          <FadeIn>
            <div className="mb-14 text-center">
              <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-zinc-600">FAQ</div>
              <h2 className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl">
                الأسئلة الشائعة
              </h2>
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <div className="space-y-2">
              {[
                ['هل فيه اشتراك شهري؟', 'لا. النظام بدون أي اشتراك شهري — تدفع عمولة رمزية فقط على العمليات المكتملة.'],
                ['كم تأخذ عملية التسجيل؟', 'دقائق فقط. سجّل مركزك، وبعد اعتماد الطلب تدخل لوحة التحكم مباشرة.'],
                ['هل يناسب نوع نشاطي؟', 'نعم — مغاسل، تلميع، تغيير زيوت، بطاريات، كهرباء، وميكانيكا. النظام يتشكّل حسب نوع مركزك.'],
                ['هل الفواتير متوافقة مع هيئة الزكاة؟', 'نعم، فواتير ضريبية مبسطة متوافقة مع ZATCA مع رمز QR قابل للمسح.'],
                ['هل أقدر أدير أكثر من فرع؟', 'نعم، تتنقّل بين كل فروعك من نفس اللوحة وبيانات منفصلة لكل فرع.'],
              ].map(([q, a], i) => (
                <details key={i} className="group rounded-xl border border-zinc-800 bg-[#121212] px-5 py-4 transition-colors hover:border-zinc-700">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-white [&::-webkit-details-marker]:hidden">
                    {q}
                    <svg className="flex-none text-zinc-600 transition-transform duration-300 group-open:rotate-45" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </summary>
                  <p className="mt-3 text-sm font-light leading-relaxed text-zinc-400">{a}</p>
                </details>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-5 pb-24 pt-8">
          <FadeIn>
            <div className="rounded-2xl border border-zinc-800 bg-[#121212] px-6 py-16 text-center">
              <h3 className="text-3xl font-medium tracking-tight text-white sm:text-4xl">
                مركزك يستاهل نظام أفضل
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-zinc-400">
                بدون اشتراكات شهرية · عمولة رمزية فقط على الطلبات المنجزة.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={registerHref} className="w-full rounded-xl bg-white px-7 py-3 text-sm font-medium text-[#0a0a0a] transition hover:bg-zinc-100 sm:w-auto">
                  {finalCtaLabel}
                </Link>
                {!authed && (
                  <Link href="/auth/signin" className="w-full rounded-xl border border-zinc-800 px-7 py-3 text-sm font-light text-zinc-400 transition hover:border-zinc-700 hover:text-white sm:w-auto">
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ════ Footer ════ */}
        <footer className="border-t border-white/10 bg-black/30">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {/* brand */}
              <div className="col-span-2 md:col-span-1">
                <Logo className="h-7 w-auto text-white" />
                <p className="mt-4 max-w-xs text-sm font-light leading-relaxed text-zinc-500">
                  نظام إدارة مراكز العناية بالمركبات — صُمّم في السعودية 🇸🇦
                </p>
                <div className="mt-5 flex items-center gap-2.5">
                  {[
                    ['Instagram', 'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.17.4.37 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.17-1 .37-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2zm0 3.5a6.3 6.3 0 100 12.6 6.3 6.3 0 000-12.6zm0 10.4a4.1 4.1 0 110-8.2 4.1 4.1 0 010 8.2zm6.5-10.6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z'],
                    ['TikTok', 'M16.5 3c.3 2.2 1.6 3.6 3.5 3.8v2.5c-1.3.1-2.5-.3-3.5-1v6.4a5.6 5.6 0 11-5.6-5.6c.3 0 .6 0 .9.08v2.6a3 3 0 102.1 2.8V3h2.6z'],
                    ['Snapchat', 'M12 2c2.6 0 4.3 2 4.4 4.5.04.8 0 1.5 0 1.8.5.3 1 .1 1.4 0 .5-.2 1 .5.6 1-.3.4-1.2.6-1.6.9-.3.2.4 1.3 1.2 2 .7.6 1.6.9 2 1 .4.2.3.7-.1.9-.5.3-1.4.2-1.8.6-.2.3 0 .9-.5 1-.4 0-1-.4-1.8-.3-.7.1-1.3.9-2.6.9s-1.9-.8-2.6-.9c-.8-.1-1.4.3-1.8.3-.5-.1-.3-.7-.5-1-.4-.4-1.3-.3-1.8-.6-.4-.2-.5-.7-.1-.9.4-.1 1.3-.4 2-1 .8-.7 1.5-1.8 1.2-2-.4-.3-1.3-.5-1.6-.9-.4-.5.1-1.2.6-1 .4.1.9.3 1.4 0 0-.3-.04-1 0-1.8C7.7 4 9.4 2 12 2z'],
                    ['X', 'M17.5 3h3l-6.6 7.5L21.7 21h-5.9l-4.3-5.6L6.3 21H3.3l7-8L2.6 3h6l3.9 5.2L17.5 3zm-1 16h1.6L7.6 4.7H5.9L16.5 19z'],
                  ].map(([label, d]) => (
                    <a key={label} href="#" aria-label={label} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* product */}
              <div>
                <div className="text-sm font-medium text-white">المنتج</div>
                <ul className="mt-4 space-y-2.5 text-sm font-light text-zinc-500">
                  <li><a href="#features" className="transition hover:text-white">المزايا</a></li>
                  <li><a href="#pricing" className="transition hover:text-white">الأسعار</a></li>
                  <li><a href="#faq" className="transition hover:text-white">الأسئلة الشائعة</a></li>
                  <li><Link href={appHref} className="transition hover:text-white">تسجيل الدخول</Link></li>
                </ul>
              </div>

              {/* company */}
              <div>
                <div className="text-sm font-medium text-white">الشركة</div>
                <ul className="mt-4 space-y-2.5 text-sm font-light text-zinc-500">
                  <li><a href="#" className="transition hover:text-white">من نحن</a></li>
                  <li><a href="mailto:voldmotorglobal@gmail.com" className="transition hover:text-white">تواصل معنا</a></li>
                  <li><a href="#faq" className="transition hover:text-white">الأسئلة الشائعة</a></li>
                  <li><a href="#" className="transition hover:text-white">سياسة الخصوصية</a></li>
                </ul>
              </div>

              {/* app + contact */}
              <div>
                <div className="text-sm font-medium text-white">حمّل التطبيق</div>
                <div className="mt-4 space-y-2.5">
                  {[['App Store', 'M16.4 12.9c0-2 1.6-3 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.5.8-3.2 2-1.4 2.3-.4 5.8 1 7.7.6.9 1.4 1.9 2.4 1.9s1.3-.6 2.5-.6 1.5.6 2.6.6 1.7-.9 2.3-1.8c.7-1 1-2 1-2-.1 0-2-.8-2-3.3zM14.6 6.3c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.7-.4 2.3-1.1z'], ['Google Play', 'M3.6 2.3c-.2.2-.3.5-.3.9v17.6c0 .4.1.7.3.9l.1.1L13.5 12 3.7 2.2l-.1.1zM17 8.5l-2.3-1.3-2.4 2.4 2.4 2.4L17 10.7c.8-.5.8-1.7 0-2.2zM4.3 2.1l8 4.6L14.6 9 4.3 2.1zM14.6 15l-2.3 2.3-8 4.6L14.6 15z']].map(([name, d]) => (
                    <a key={name} href="#" className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 transition hover:border-zinc-700">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-none text-zinc-400"><path d={d} /></svg>
                      <span className="flex-1 text-xs font-light text-zinc-400">{name}</span>
                      <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-600">قريباً</span>
                    </a>
                  ))}
                  <a href="mailto:voldmotorglobal@gmail.com" className="flex items-center gap-2 pt-1 text-xs font-light text-zinc-500 transition hover:text-white" dir="ltr">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
                    voldmotorglobal@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
              <span>© 2026 VOLD MOTOR · جميع الحقوق محفوظة</span>
              <div className="flex items-center gap-5">
                <a href="#" className="transition hover:text-white">الخصوصية</a>
                <a href="#faq" className="transition hover:text-white">الأسئلة الشائعة</a>
                <a href="mailto:voldmotorglobal@gmail.com" className="transition hover:text-white">تواصل معنا</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
