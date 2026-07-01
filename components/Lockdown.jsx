import { Lock, ShieldAlert } from 'lucide-react';

/**
 * Full-screen governance wall — rendered IN PLACE of the whole dashboard tree so a
 * flagged center can't reach any shell content. We render (not redirect) because the
 * session cookie stays active while the profile flag blocks: redirecting to /auth
 * would loop (middleware bounces authed users off /auth/*). Super-Admins bypass.
 *   variant="frozen" → dark hard-suspension screen.
 *   variant="audit"  → amber mandatory-audit boundary.
 */
export default function Lockdown({ variant = 'audit' }) {
  if (variant === 'frozen') {
    return (
      <div dir="rtl" className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
          <Lock size={30} strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">تم تجميد هذا الحساب مؤقتاً</h1>
        <p className="mt-3 max-w-md text-sm font-medium text-slate-400">يرجى التواصل مع إدارة المنصة لتسوية وضع الحساب الضريبي والاشتراك.</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex min-h-screen w-full flex-col items-center justify-center bg-amber-50 p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-10 shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-600">
          <ShieldAlert size={30} strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900">الحساب تحت التدقيق المالي</h1>
        <p className="mt-3 text-sm font-medium text-slate-500">الحساب تحت التدقيق المالي الإجباري حالياً من قبل الإدارة العليا.</p>
      </div>
    </div>
  );
}
