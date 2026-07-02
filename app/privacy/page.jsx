/* «سياسة الخصوصية» — صفحة مستقلة بهوية الهبوط الداكنة. */
import Link from 'next/link';

export const metadata = { title: 'سياسة الخصوصية — VOLD MOTOR' };

const SECTIONS = [
  ['البيانات التي نجمعها', 'نجمع ما يلزم لتشغيل حسابك فقط: بيانات التسجيل (اسم المركز، البريد، الجوال)، وبيانات التشغيل التي يدخلها فريقك (العمليات، العملاء، المخزون، الفواتير). لا نجمع بيانات لا تحتاجها الخدمة.'],
  ['كيف نستخدمها', 'تُستخدم بياناتك حصراً لتقديم الخدمة: عرض لوحاتك وتقاريرك، احتساب المستحقات، إرسال الإشعارات التشغيلية، وتحسين المنصة. لا نبيع بياناتك ولا نشاركها مع معلنين — إطلاقاً.'],
  ['بيانات عملائك', 'أسماء وأرقام عملاء مركزك ملكٌ لك. نعالجها بالنيابة عنك لتشغيل الخدمة فقط (الفواتير، رسائل واتساب التي ترسلها بنفسك)، ولا نستخدمها لأي غرض آخر.'],
  ['الحماية والتخزين', 'تُخزَّن البيانات لدى مزوّد بنية تحتية عالمي بتشفير أثناء النقل (HTTPS/TLS) وأثناء التخزين، مع عزل صارم بين حسابات المراكز، وجلسات تنتهي تلقائياً بعد الخمول، وتحقق بخطوتين عند الدخول.'],
  ['المدفوعات', 'عمليات الدفع الإلكتروني (مثل Apple Pay) تُعالج عبر بوابة دفع سعودية مرخّصة — لا تمر بيانات بطاقتك على خوادمنا ولا نخزّنها أبداً.'],
  ['حقوقك', 'يحق لك في أي وقت: طلب نسخة من بياناتك، تصحيحها، أو حذف حسابك وبياناته نهائياً. راسلنا وسننفّذ خلال مدة معقولة وفق الأنظمة السعودية (نظام حماية البيانات الشخصية PDPL).'],
  ['ملفات الارتباط (Cookies)', 'نستخدم ملفات جلسة ضرورية لتسجيل الدخول وتفضيلات العرض فقط — لا ملفات تتبع إعلانية.'],
  ['التحديثات', 'قد نحدّث هذه السياسة عند تطوير المنصة، وسنُعلمك بأي تغيير جوهري داخل لوحتك قبل سريانه.'],
];

export default function PrivacyPage() {
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
        <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-zinc-600">PRIVACY POLICY</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">سياسة الخصوصية</h1>
        <p className="mt-4 text-sm text-zinc-500">آخر تحديث: يوليو 2026</p>
        <p className="mt-6 leading-relaxed text-zinc-400">
          خصوصيتك وخصوصية عملاء مركزك أمانة. توضح هذه السياسة بشفافية ما نجمعه،
          ولماذا، وكيف نحميه، وما حقوقك — بلا لغة قانونية معقدة.
        </p>

        <div className="mt-10 space-y-4">
          {SECTIONS.map(([t, d], i) => (
            <section key={t} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
              <h2 className="text-base font-bold">
                <span className="me-2 text-zinc-600">{String(i + 1).padStart(2, '0')}</span>{t}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-sm leading-relaxed text-zinc-400">
          لأي استفسار عن الخصوصية أو لممارسة حقوقك: راسلنا عبر
          <span className="mx-1 font-bold text-white">privacy@voldmotor.com</span>
          وسنرد خلال يومي عمل.
        </p>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-600">
        © {new Date().getFullYear()} VOLD MOTOR — جميع الحقوق محفوظة · <Link href="/about" className="hover:text-white">من نحن</Link>
      </footer>
    </div>
  );
}
