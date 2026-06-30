'use client';
import { Lock } from 'lucide-react';

/** Hard authorization boundary for permission-gated deep links. */
export default function Forbidden403({ title = 'الوصول مرفوض — 403', hint = 'لا تملك صلاحية الوصول إلى هذه الصفحة. تواصل مع مالك المركز لمنحك الصلاحية.' }) {
  return (
    <div className="mx-auto grid max-w-md place-items-center py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><Lock size={26} /></div>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1.5 text-sm font-medium text-slate-500">{hint}</p>
    </div>
  );
}
