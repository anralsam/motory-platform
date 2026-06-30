'use client';
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const BLUE = '#2563eb';

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-extrabold text-slate-900">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 font-bold" style={{ color: BLUE }}>
        <span className="h-2 w-2 rounded-full" style={{ background: BLUE }} /> {Number(payload[0].value).toLocaleString('en')} عملية
      </div>
    </div>
  );
}

export default function DailyOpsChart({ data = [] }) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="opsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
              <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef0f3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={28} allowDecimals={false} />
          <Tooltip content={<TooltipBox />} />
          <Area type="monotone" dataKey="ops" stroke={BLUE} strokeWidth={2.5} fill="url(#opsFill)" dot={false} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
