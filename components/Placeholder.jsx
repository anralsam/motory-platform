'use client';
import { useSelectedBranch } from '@/store/branchStore';

export default function Placeholder({ title, note }) {
  const branch = useSelectedBranch();
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="text-sm text-slate-500">
          الفرع الحالي: {branch?.name || 'كل الفروع'} — تتفاعل هذه الصفحة مع المحوّل العام.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
        {note || 'محتوى هذه الوحدة يُبنى هنا.'}
      </div>
    </div>
  );
}
