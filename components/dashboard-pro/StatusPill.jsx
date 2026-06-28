/**
 * StatusPill — pill-shaped status badge, extremely light background.
 * VOLD MOTOR palette: blue (primary) · emerald (success) · amber (warning) · slate.
 */
const MAP = {
  pending: { c: 'bg-amber-50 text-amber-600', t: 'انتظار' },
  in_progress: { c: 'bg-blue-50 text-blue-600', t: 'جاري العمل' },
  ready: { c: 'bg-violet-50 text-violet-600', t: 'جاهز' },
  completed: { c: 'bg-emerald-50 text-emerald-600', t: 'مكتمل' },
  approved: { c: 'bg-emerald-50 text-emerald-600', t: 'مفعّل' },
  rejected: { c: 'bg-rose-50 text-rose-600', t: 'مرفوض' },
  locked: { c: 'bg-fuchsia-50 text-fuchsia-600', t: 'مقفول' },
};

export default function StatusPill({ status, children }) {
  const s = MAP[status] || { c: 'bg-slate-100 text-slate-600', t: status };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.c}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children || s.t}
    </span>
  );
}
