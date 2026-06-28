/**
 * StatTile — VOLD MOTOR design-system metric tile.
 * Soft Apple UI: bg-white, border-slate-100, rounded-2xl, microscopic shadow-sm.
 * Inter + tabular-nums for the value. Server-safe (Lucide icon passed as prop).
 */
const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatTile({ icon: Icon, label, value, sub, tone = 'slate' }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-normal text-slate-500">{label}</span>
        {Icon ? (
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${TONES[tone] || TONES.slate}`}>
            <Icon size={18} strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div className="mt-4 font-inter text-3xl font-semibold tracking-tight tabular-nums text-slate-900" dir="ltr">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs font-normal text-slate-400">{sub}</div> : null}
    </div>
  );
}
