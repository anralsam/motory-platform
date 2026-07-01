import { ShieldAlert, Lock } from 'lucide-react';

/**
 * Full-container governance wall.
 *   variant="audit"  → center is under platform review (temporary).
 *   variant="frozen" → account suspended by the platform (hard cutoff).
 * Rendered in place of the whole dashboard so a flagged center can't reach any
 * shell content. (We render rather than redirect to avoid an auth-route loop:
 * the user is still authenticated, and middleware bounces authed users off /auth.)
 */
const VARIANTS = {
  audit: {
    Icon: ShieldAlert,
    tone: 'border-amber-200 bg-amber-50 text-amber-500',
    title: 'الحساب تحت التدقيق',
    hint: 'حسابك قيد المراجعة من إدارة المنصة حالياً. تم تعليق الوصول مؤقتاً لحين انتهاء التدقيق. للاستفسار تواصل مع الدعم.',
  },
  frozen: {
    Icon: Lock,
    tone: 'border-rose-200 bg-rose-50 text-rose-500',
    title: 'الحساب مجمّد',
    hint: 'تم تجميد حسابك من إدارة المنصة وتعليق الوصول إلى لوحة التحكم. يُرجى التواصل مع الدعم لإعادة التفعيل.',
  },
};

export default function Lockdown({ variant = 'audit' }) {
  const v = VARIANTS[variant] || VARIANTS.audit;
  const { Icon } = v;
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className={`w-full max-w-md rounded-2xl border bg-white p-10 text-center shadow-sm ${variant === 'frozen' ? 'border-rose-200' : 'border-amber-200'}`}>
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${v.tone}`}><Icon size={28} /></div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{v.title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">{v.hint}</p>
      </div>
    </div>
  );
}
