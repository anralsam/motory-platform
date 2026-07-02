/* «من نحن» — صفحة مستقلة بهوية الهبوط الداكنة. */
import Link from 'next/link';

export const metadata = { title: 'من نحن — VOLD MOTOR' };

const VALUES = [
  ['🎯', 'رسالتنا', 'تمكين كل مركز عناية بالسيارات في المملكة من إدارة عملياته بذكاء المنصات العالمية — بلا تعقيد، وبلا تكلفة مقدمة.'],
  ['⚙️', 'ماذا نقدّم', 'نظام تشغيل متكامل: استقبال العميل، متابعة حية للفروع، مخزون ذكي بتنبيهات النواقص، فوترة إلكترونية بضغطة، وتحليلات تقود قراراتك.'],
  ['🤝', 'نموذج شراكة', 'لا اشتراكات ولا رسوم ثابتة — عمولة رمزية 0.4% على العملية المكتملة فقط. ننجح عندما تنجح.'],
  ['🇸🇦', 'صناعة سعودية', 'منصة بُنيت من قلب السوق السعودي: خدمات المغاسل وزيوت السوق المحلي، الفاتورة بمتطلبات ZATCA، والريال برمزه الرسمي الجديد.'],
];

export default function AboutPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a0a] font-sans text-white antialiased">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center" aria-label="VOLD MOTOR">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="VOLD MOTOR" className="h-7 w-auto" />
        </Link>
        <Link href="/" className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:text-white">← العودة للرئيسية</Link>
      </nav>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-zinc-600">ABOUT US</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">من نحن</h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          <span className="font-bold text-white">VOLD MOTOR</span> منصة سعودية متخصصة في تشغيل مراكز العناية
          بالسيارات — من مغاسل السيارات ومراكز تغيير الزيوت إلى البطاريات والميكانيكا والزينة.
          وُلدت المنصة من ملاحظة بسيطة: أصحاب المراكز يديرون أعمالًا بمئات الآلاف بدفاتر ورقية
          وجوّالات مبعثرة. قرّرنا أن نعطيهم لوحة قيادة بمستوى المنصات العالمية، بلغة عربية أصيلة،
          وبنموذج شراكة عادل.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {VALUES.map(([icon, t, d]) => (
            <div key={t} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
              <div className="text-2xl">{icon}</div>
              <h2 className="mt-3 text-base font-bold">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-center">
          {[['+400', 'مركز شريك'], ['4.9/5', 'رضا الشركاء'], ['24/7', 'منصة تعمل دائماً']].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-extrabold text-white">{v}</div>
              <div className="mt-1 text-xs text-zinc-500">{l}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link href="/auth/signup" className="inline-block rounded-xl bg-[#2563eb] px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]">
            سجّل مركزك وانضم للشركاء
          </Link>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} VOLD MOTOR — جميع الحقوق محفوظة · <Link href="/privacy" className="hover:text-white">سياسة الخصوصية</Link>
      </footer>
    </div>
  );
}
