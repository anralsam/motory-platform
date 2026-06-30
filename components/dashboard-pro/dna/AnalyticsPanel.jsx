'use client';

/**
 * AnalyticsPanel — the shared "Billion-Dollar" analytical core consumed by BOTH the
 * /dashboard-pro merchant surface and the legacy /dashboard owner section, so the two
 * stay at 100% visual + logical parity. Reads everything from useDashboardData (the
 * UnifiedChart matrix is the master controller): premium metric cards + the floating
 * master chart + status donut + top-5 services — all on one staggered fade-in.
 */
import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Wallet, Activity, Users, Gauge } from 'lucide-react';
import { useDashboardData } from './DashboardContainer';
import UnifiedChart from './UnifiedChart';
import { fmtValue } from './engine';

const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } } };
const RISE = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

function MetricCard({ icon: Icon, label, value }) {
  return (
    <motion.div variants={RISE}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-accent transition-transform duration-500 group-hover:scale-110">
          <Icon size={20} strokeWidth={2.2} />
        </span>
      </div>
      <div className="mt-8 font-inter text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-slate-900" dir="ltr">{value}</div>
      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#2563eb]" />
    </motion.div>
  );
}

export default function AnalyticsPanel() {
  const { kpis = {}, statusDist = [], topServices = [], windowCount = 0 } = useDashboardData() || {};
  const maxSvc = topServices[0]?.count || 1;

  return (
    <motion.div variants={STAGGER} initial="hidden" animate="show" className="space-y-8">
      {/* Premium metric cards — re-window live with the UnifiedChart timeline */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Wallet} label="الإيراد" value={fmtValue(kpis.revenue, 'sar')} />
        <MetricCard icon={Activity} label="العمليات" value={fmtValue(kpis.orders, 'int')} />
        <MetricCard icon={Users} label="حمل الفنّيين" value={`${kpis.techLoad || 0}%`} />
        <MetricCard icon={Gauge} label="الكفاءة" value={`${kpis.efficiency || 0}%`} />
      </div>

      {/* Floating master chart */}
      <motion.div variants={RISE}>
        <UnifiedChart />
      </motion.div>

      {/* Status donut + top services */}
      <motion.div variants={RISE} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-1">
          <div className="text-lg font-bold tracking-tight text-slate-900">توزيع الحالات</div>
          <div className="mt-1 mb-8 text-sm font-medium text-slate-500">إجمالي {windowCount.toLocaleString('en-US')} طلب</div>
          {statusDist.length ? (
            <>
              <div className="relative mx-auto h-44 w-44" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={3} strokeWidth={0} cornerRadius={6}>
                      {statusDist.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 30px -6px rgba(0,0,0,0.12)' }} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-inter text-3xl font-bold tabular-nums text-slate-900" dir="ltr">{windowCount}</span>
                  <span className="text-[10px] font-medium text-slate-400">طلب</span>
                </div>
              </div>
              <div className="mt-8 space-y-3.5">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 font-medium text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}</span>
                    <span className="font-inter font-bold tabular-nums text-slate-900" dir="ltr">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-sm text-slate-400">لا توجد بيانات ضمن النطاق</div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-2">
          <div className="text-lg font-bold tracking-tight text-slate-900">أفضل الخدمات</div>
          <div className="mt-1 mb-8 text-sm font-medium text-slate-500">الأكثر طلباً مع إيرادها</div>
          {topServices.length ? (
            <div className="space-y-6">
              {topServices.map((s, i) => (
                <div key={s.name + i}>
                  <div className="mb-2.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-3 font-semibold text-slate-700">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100 font-inter text-[11px] font-bold text-slate-500" dir="ltr">{i + 1}</span>
                      {s.name}
                    </span>
                    <span className="flex items-center gap-4">
                      <span className="text-xs font-medium text-slate-400">{s.count} طلب</span>
                      <span className="font-inter font-bold tabular-nums text-slate-900" dir="ltr">{fmtValue(s.revenue, 'sar')}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(5, Math.round((s.count / maxSvc) * 100))}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
                      className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-slate-400">لا توجد خدمات ضمن النطاق</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
