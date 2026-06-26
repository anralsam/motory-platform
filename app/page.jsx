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

/* ── VOLD MOTOR wordmark — dark-mode variant (white text, transparent) ── */
function Logo({ className = 'h-7 w-auto' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-white.png" alt="VOLD MOTOR" className={className} />;
}

/* ── Signature feature: high-fidelity Saudi license plate (pure SVG) ──
   Realistic white face with paper-grain gradient, embossed national seal,
   bold Arabic + Latin glyphs, and a diagonal glass light-reflection overlay. */
function SaudiPlate({ ar = '١ ٢ ٣ ٤', arLetters = 'ر ق ص', latin = '1 2 3 4', latinLetters = 'S Q R', size = 'md' }) {
  const dims = { sm: { w: 196, h: 64 }, md: { w: 260, h: 86 }, lg: { w: 320, h: 104 } }[size] || { w: 260, h: 86 };
  return (
    <svg viewBox="0 0 320 104" width={dims.w} height={dims.h} className="select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.4)]" role="img" aria-label="لوحة سعودية">
      <defs>
        {/* paper-grain white face */}
        <linearGradient id="plateFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#f4f5f7" />
          <stop offset="1" stopColor="#e7e9ee" />
        </linearGradient>
        {/* blue KSA band */}
        <linearGradient id="plateBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e63e9" />
          <stop offset="1" stopColor="#143fae" />
        </linearGradient>
        {/* diagonal glossy reflection */}
        <linearGradient id="plateGloss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.22" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="plateSeal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c2c7d0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c2c7d0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* body + thin metallic frame, flat white face */}
      <rect x="1.5" y="1.5" width="317" height="101" rx="12" fill="#aeb3bd" />
      <rect x="3" y="3" width="314" height="98" rx="10.5" fill="#ffffff" stroke="#c7ccd4" strokeWidth="1" />

      {/* mounting bolt holes (top corners) */}
      <circle cx="120" cy="12" r="2.4" fill="#c7ccd4" />
      <circle cx="248" cy="12" r="2.4" fill="#c7ccd4" />

      {/* top KSA caption strip */}
      <text x="184" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9aa0ab" fontFamily="Arial" letterSpacing="1">KINGDOM OF SAUDI ARABIA</text>
      <line x1="52" y1="26" x2="316" y2="26" stroke="#e1e4ea" strokeWidth="1" />

      {/* left blue band: flag + KSA + السعودية */}
      <path d="M3 14a11 11 0 0 1 11-11h36v98H14A11 11 0 0 1 3 90z" fill="url(#plateBand)" />
      <g>
        <rect x="11" y="14" width="30" height="20" rx="2.5" fill="#157a3c" />
        <rect x="11" y="14" width="30" height="20" rx="2.5" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />
        <text x="26" y="27" textAnchor="middle" fontSize="7" fill="#ffffff" fontFamily="Arial">السعودية</text>
      </g>
      <text x="26" y="52" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffffff" fontFamily="Arial">KSA</text>
      <text x="26" y="78" textAnchor="middle" fontSize="9" fontWeight="700" fill="#cfe0ff" fontFamily="Arial">السعودية</text>

      {/* center divider between numbers (left) and letters (right) */}
      <line x1="186" y1="34" x2="186" y2="92" stroke="#d4d8e0" strokeWidth="1.4" />

      {/* glyphs — Arabic (top) over Latin (bottom). Letters RIGHT, numbers LEFT (KSA reading order) */}
      <g fontFamily="Arial" fill="#16181d">
        {/* numbers (left section) */}
        <text x="118" y="62" textAnchor="middle" fontSize="30" fontWeight="800" letterSpacing="4">{ar}</text>
        <text x="118" y="86" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="5" fill="#5a606b">{latin}</text>
        {/* letters (right section) */}
        <text x="252" y="62" textAnchor="middle" fontSize="30" fontWeight="800" letterSpacing="6">{arLetters}</text>
        <text x="252" y="86" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="6" fill="#5a606b">{latinLetters}</text>
      </g>

      {/* flat — no gloss (looks like a real, official plate) */}
    </svg>
  );
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

/* ── [1] POS — Saudi plate, centred with a subtle shadow ── */
function BentoPOS() {
  return (
    <div className="flex w-full items-center justify-center">
      <SaudiPlate size="sm" />
    </div>
  );
}

/* ── [2] Kanban — realistic technician task board (neutral, enterprise) ── */
function BentoKanban() {
  const cols = [
    { t: 'قيد الانتظار', count: '٣', dot: 'bg-zinc-600', car: 'تويوتا كامري', svc: 'غسيل خارجي', plate: '٤٥٢١', time: 'منذ ٤٥ د', tech: 'ع' },
    { t: 'جاري العمل', count: '٢', dot: 'bg-zinc-400', car: 'لكزس ES', svc: 'تلميع وتشميع', plate: '٧٨٩٣', time: '١٨ د', tech: 'س' },
    { t: 'جاهزة', count: '٥', dot: 'bg-zinc-300', car: 'نيسان باترول', svc: 'تغيير زيت', plate: '٢٢٦٠', time: 'تم', tech: 'ف' },
  ];
  return (
    <div className="grid w-full grid-cols-3 gap-2">
      {cols.map((c, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1">
              <span className={`h-1.5 w-1.5 flex-none rounded-full ${c.dot}`} />
              <span className="truncate text-[8px] font-semibold text-zinc-400">{c.t}</span>
            </div>
            <span className="flex-none rounded bg-zinc-800 px-1 text-[7px] font-bold text-zinc-500">{c.count}</span>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-[#181818] p-1.5">
            <div className="truncate text-[8.5px] font-bold text-zinc-100">{c.car}</div>
            <div className="mt-0.5 truncate text-[7px] text-zinc-500">{c.svc}</div>
            <div className="mt-1.5 inline-flex overflow-hidden rounded-[3px] border border-zinc-700 font-mono text-[6.5px]" dir="ltr">
              <span className="bg-[#1d4ed8] px-1 text-white">KSA</span>
              <span className="bg-white px-1 font-bold tracking-wider text-neutral-900">{c.plate}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-zinc-800 pt-1.5">
              <span className="text-[7px] text-zinc-500">{c.time}</span>
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-zinc-700 text-[6px] font-bold text-zinc-300">{c.tech}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── [3] Reports — glowing hand-coded SVG area chart (no library) ── */
function BentoReports() {
  // smooth area path + line path over a 220×88 viewport
  const line = 'M4 64 C 28 58, 40 40, 62 44 S 104 22, 126 30 S 168 8, 190 16 216 10';
  const area = 'M4 64 C 28 58, 40 40, 62 44 S 104 22, 126 30 S 168 8, 190 16 216 10 L216 84 L4 84 Z';
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500">الإيراد · آخر ٧ أيام</span>
        <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          ٢٣٪
        </span>
      </div>
      <svg viewBox="0 0 220 88" className="w-full" preserveAspectRatio="none" height="100">
        <defs>
          <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#52525b" stopOpacity="0.4" />
            <stop offset="1" stopColor="#52525b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 44, 64].map((y) => <line key={y} x1="4" y1={y} x2="216" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />)}
        <path d={area} fill="url(#repFill)" />
        <path d={line} fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="216" cy="10" r="3.2" fill="#d4d4d8" stroke="#71717a" strokeWidth="2" />
      </svg>
    </div>
  );
}

/* ── [4] Invoice — simulated thermal receipt w/ paper texture + sharp QR ── */
function ThermalQR() {
  // deterministic 11×11 QR-style matrix with three finder eyes
  const N = 11;
  const eye = (r, c) => (r < 3 && c < 3) || (r < 3 && c > N - 4) || (r > N - 4 && c < 3);
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (eye(r, c)) continue;
    if (((r * 7 + c * 13 + r * c) % 3) === 0) cells.push(<rect key={`${r}-${c}`} x={c * 4} y={r * 4} width="4" height="4" />);
  }
  const finder = (x, y) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="12" height="12" fill="#0a0a0a" />
      <rect x="2" y="2" width="8" height="8" fill="#fff" />
      <rect x="3.5" y="3.5" width="5" height="5" fill="#0a0a0a" />
    </g>
  );
  return (
    <svg viewBox="0 0 44 44" width="56" height="56" shapeRendering="crispEdges" className="rounded-[3px] bg-white p-[2px]">
      <g fill="#0a0a0a">{cells}</g>
      {finder(0, 0)}{finder(32, 0)}{finder(0, 32)}
    </svg>
  );
}
function BentoInvoice() {
  // scalloped bottom edge (receipt tear) via a repeating radial mask
  const scallop = {
    WebkitMaskImage: 'radial-gradient(circle 5px at 8px 100%, transparent 98%, #000 100%)',
    maskImage: 'radial-gradient(circle 5px at 8px 100%, transparent 98%, #000 100%)',
    WebkitMaskRepeat: 'repeat-x', maskRepeat: 'repeat-x',
    WebkitMaskSize: '16px 100%', maskSize: '16px 100%',
  };
  return (
    <div
      className="relative mx-auto w-[164px] bg-[#fbfbf9] font-mono text-[9px] leading-tight text-neutral-900 shadow-[0_20px_45px_-14px_rgba(0,0,0,0.85)]"
      style={{ borderRadius: '10px 10px 0 0', ...scallop }}
    >
      {/* paper grain */}
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.045) 0.5px, transparent 0.5px)', backgroundSize: '3px 3px' }} />
      {/* brand accent */}
      <div className="h-1 w-full rounded-t-[10px] bg-zinc-900" />
      <div className="relative px-4 pb-5 pt-3">
        <div className="flex flex-col items-center gap-1">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900">
            <svg width="12" height="12" viewBox="0 0 48 48" fill="none"><path d="M6 10 L24 42 L42 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="text-[11px] font-extrabold tracking-tight">مركز رائد للعناية</div>
          <div className="text-[7px] text-neutral-500">الرقم الضريبي: 300012345600003</div>
          <div className="mt-0.5 rounded-sm bg-neutral-900 px-1.5 py-0.5 text-[7px] font-bold tracking-wide text-white">فاتورة ضريبية مبسطة</div>
        </div>
        <div className="my-2 border-t border-dashed border-neutral-300" />
        <div className="flex justify-between"><span className="text-neutral-500">رقم الفاتورة</span><span className="font-bold">INV-9A1F</span></div>
        <div className="mt-0.5 flex justify-between"><span className="text-neutral-500">التاريخ والوقت</span><span className="font-bold">٢٣/٠٦/٢٠٢٦ · ٢:٤٥م</span></div>
        <div className="mt-0.5 flex justify-between"><span className="text-neutral-500">العميل</span><span className="font-bold">سعد العتيبي</span></div>
        <div className="my-2 border-t border-dashed border-neutral-300" />
        <div className="flex justify-between text-[7px] font-bold text-neutral-400"><span>الصنف</span><span>الإجمالي</span></div>
        <div className="mt-1 flex justify-between"><span>غسيل VIP خارجي وداخلي</span><span className="font-bold">90.00</span></div>
        <div className="mt-0.5 flex justify-between text-neutral-500"><span>الكمية ×١ · سعر 90.00</span></div>
        <div className="my-2 border-t border-dashed border-neutral-300" />
        <div className="flex justify-between text-neutral-600"><span>الإجمالي قبل الضريبة</span><span>90.00</span></div>
        <div className="mt-0.5 flex justify-between text-neutral-600"><span>ضريبة القيمة المضافة ١٥٪</span><span>13.50</span></div>
        <div className="mt-1.5 flex items-center justify-between rounded-md bg-neutral-900 px-2 py-1.5 text-[11px] font-extrabold text-white"><span>الإجمالي شامل الضريبة</span><span>103.50</span></div>
        <div className="mt-3 flex flex-col items-center gap-1">
          <ThermalQR />
          <div className="text-[7px] tracking-wide text-neutral-500">امسح رمز QR للتحقق — هيئة الزكاة والضريبة</div>
          <div className="mt-1 text-[8px] font-bold text-neutral-700">شكراً لزيارتكم 🤍</div>
        </div>
      </div>
    </div>
  );
}

/* ── Desktop window frame that wraps each feature mock ── */
function WindowFrame({ label = '', children }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
      {/* chrome bar */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        {label && (
          <span className="mx-auto pr-6 text-[10px] font-medium tracking-wide text-zinc-600">{label}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const BENTOS = [
  { key: 'pos', tag: 'الاستقبال', title: 'لوحة الاستقبال الذكية', desc: 'استقبل السيارة وأسندها لفني في ثوانٍ — بقراءة لوحة سعودية حقيقية.', Mock: BentoPOS },
  { key: 'kanban', tag: 'العمليات', title: 'لوحة الفنيين اللحظية', desc: 'تابع كل سيارة من قيد الانتظار حتى التسليم، بسحب وإفلات.', Mock: BentoKanban },
  { key: 'reports', tag: 'التقارير', title: 'تقارير لحظية', desc: 'إيرادك وإشغالك ونموّك في رسوم بيانية حيّة تتحدث عن نفسها.', Mock: BentoReports },
  { key: 'invoice', tag: 'الفوترة', title: 'فواتير ZATCA إلكترونية', desc: 'فاتورة ضريبية متوافقة برمز QR تُرسل للعميل عبر واتساب.', Mock: BentoInvoice },
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
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] font-inter text-white antialiased">
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
          <FadeIn>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" /> نظام تشغيل متكامل لمراكز العناية بالسيارات
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="text-balance pb-2 text-4xl font-medium leading-[1.2] tracking-tight text-white sm:text-5xl">
              نظام التشغيل المتكامل<br />لمراكز العناية بالسيارات
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base font-light leading-relaxed text-zinc-400">
              تحكم كامل في عمليات مركزك، من استقبال العميل وحتى إصدار الفاتورة الضريبية — في واجهة واحدة.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
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
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-light text-zinc-500">
              <span>★ 4.9/5</span>
              <span className="text-zinc-700">·</span>
              <span>يثق بنا أكثر من +400 مركز شريك</span>
            </div>
          </FadeIn>
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
            {BENTOS.map((b, i) => {
              const Mock = b.Mock;
              return (
                <motion.div
                  key={b.key}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-[#121212] p-8 transition-colors duration-300 hover:border-zinc-700"
                >
                  <div className="text-[10px] font-medium uppercase tracking-[0.35em] text-zinc-600">{b.tag}</div>
                  <h3 className="mt-3 text-base font-medium tracking-tight text-white">{b.title}</h3>
                  <p className="mt-1.5 text-sm font-light leading-relaxed text-zinc-400">{b.desc}</p>
                  <div className="mt-6">
                    <WindowFrame label={b.tag}>
                      <Mock />
                    </WindowFrame>
                  </div>
                </motion.div>
              );
            })}
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
