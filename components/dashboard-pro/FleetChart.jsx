'use client';

/**
 * FleetChart — order-status distribution donut (recharts). Smooth, minimal,
 * VOLD MOTOR soft-UI card. Client component (recharts needs the browser).
 */
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function FleetChart({ data = [] }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-900">توزيع حالات الطلبات</div>
      <div className="mb-4 text-xs font-normal text-slate-400">نظرة حيّة على دورة العمل عبر الأسطول</div>

      <div className="flex items-center gap-6">
        <div className="relative h-36 w-36 flex-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="#fff" strokeWidth={3}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 12, boxShadow: 'none' }} formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-inter text-2xl font-semibold tabular-nums text-slate-900">{total}</span>
            <span className="text-[11px] font-normal text-slate-400">طلب</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: d.color }} />
              <span className="text-sm font-normal text-slate-500">{d.name}</span>
              <span className="ms-auto font-inter text-sm font-semibold tabular-nums text-slate-900">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
