'use client';

/**
 * AdminDashboard — Admin Command Center (rendered inside DashboardLayout's
 * dashboard tab; no legacy shell). System Token: #f9f9f9 page · #ffffff cards ·
 * #2563eb accents · rounded-xl · border-slate-200 · shadow-sm.
 *   • 4 metric cards with a staggered framer-motion fade-in + hover:shadow-md.
 *   • Revenue line chart (recharts, clean blue line).
 *   • High-density shop-approvals data table (optimistic actions).
 */
import { motion } from 'framer-motion';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Wallet, Activity, Store, ShieldCheck } from 'lucide-react';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ⃁`;

function MetricCard({ icon: Icon, label, value, sub, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 ease-in-out hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={19} strokeWidth={2} />
        </span>
      </div>
      <div className="mt-4 font-inter text-3xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{value}</div>
      {sub ? <div className="mt-1 text-xs font-normal text-slate-400">{sub}</div> : null}
    </motion.div>
  );
}

export default function AdminDashboard({ metrics = {}, revenue = [] }) {
  const m = metrics;
  const cards = [
    { icon: Wallet, label: 'إجمالي الإيراد', value: sar(m.revenue), sub: 'من الطلبات المكتملة' },
    { icon: Activity, label: 'طلبات قيد التنفيذ', value: (m.active || 0).toLocaleString('en-US'), sub: 'نشطة الآن' },
    { icon: Store, label: 'الورش النشطة', value: (m.workshops || 0).toLocaleString('en-US'), sub: 'مركز مفعّل' },
    { icon: ShieldCheck, label: 'بانتظار الاعتماد', value: (m.pending || 0).toLocaleString('en-US'), sub: 'طلب انضمام' },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards — staggered fade-in */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => <MetricCard key={c.label} {...c} i={i} />)}
      </div>

      {/* Revenue line chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-slate-900">الإيراد عبر الزمن</div>
        <div className="mb-4 text-xs font-normal text-slate-400">إيراد الطلبات المكتملة شهرياً</div>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={20} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: 'none' }} formatter={(v) => [sar(v), 'الإيراد']} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
