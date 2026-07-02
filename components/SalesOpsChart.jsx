'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BLUE = '#2563eb';   // sales
const SLATE = '#64748b';  // operations

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const sales = payload.find((p) => p.dataKey === 'sales')?.value ?? 0;
  const ops = payload.find((p) => p.dataKey === 'ops')?.value ?? 0;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-extrabold text-slate-900">يوم {label}</div>
      <div className="flex items-center gap-1.5 font-bold" style={{ color: BLUE }}>
        <span className="h-2 w-2 rounded-full" style={{ background: BLUE }} /> المبيعات: {Number(sales).toLocaleString('en')} ⃀
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 font-bold" style={{ color: SLATE }}>
        <span className="h-2 w-2 rounded-full" style={{ background: SLATE }} /> العمليات: {Number(ops).toLocaleString('en')}
      </div>
    </div>
  );
}

export default function SalesOpsChart({ data = [] }) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="#eef0f3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} minTickGap={16} />
          <YAxis yAxisId="sales" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={44}
                 tickFormatter={(v) => (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
          <YAxis yAxisId="ops" orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={28} allowDecimals={false} />
          <Tooltip content={<TooltipBox />} />
          <Line yAxisId="sales" type="monotone" dataKey="sales" name="حجم المبيعات" stroke={BLUE} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          <Line yAxisId="ops" type="monotone" dataKey="ops" name="الطلبات المنجزة" stroke={SLATE} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
