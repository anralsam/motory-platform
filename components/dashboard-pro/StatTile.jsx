/**
 * StatTile — hero metric card. Pixel-perfect spec:
 *   • title: xs, uppercase, tracking, slate-500.
 *   • value: 3xl, semibold, Inter, tabular-nums.
 *   • icon box: rounded-xl, subtle tinted background.
 *   • generous padding (p-7), soft hover lift (transition-all duration-300).
 */
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  slate: 'bg-slate-100 text-slate-600',
};

function GrowthPill({ growth }) {
  const up = growth >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const pct = `${up ? '+' : ''}${growth.toFixed(1)}%`;
  return (
    <span className="group/g relative">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`} dir="ltr">
        <Arrow size={12} strokeWidth={2.5} />
        {pct}
      </span>
      <span className="pointer-events-none absolute -top-8 right-0 z-10 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover/g:opacity-100">
        مقابل الشهر الماضي
      </span>
    </span>
  );
}

export default function StatTile({ icon: Icon, label, value, sub, tone = 'slate', growth }) {
  const hasGrowth = typeof growth === 'number' && isFinite(growth);
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
          {hasGrowth ? <GrowthPill growth={growth} /> : null}
          {Icon ? (
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone] || TONES.slate} transition-transform duration-300 group-hover:scale-105`}>
              <Icon size={19} strokeWidth={2} />
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-5 font-inter text-3xl font-semibold tracking-tight tabular-nums text-slate-900" dir="ltr">
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-xs font-normal text-slate-400">{sub}</div> : null}
    </div>
  );
}
