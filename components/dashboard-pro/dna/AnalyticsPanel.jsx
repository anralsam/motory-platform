'use client';

/**
 * AnalyticsPanel — VOLD MOTOR home analytics (YouTube-Studio parity, v2).
 * الترتيب المعتمد من المالك:
 *   headline («حصدت مركزك…») + فلتر الفترة (منسدلة، تشمل «كامل المدة»)
 *   → تبويبات المقاييس بنمط YouTube: الإيرادات · الأرباح · العملاء · العمليات
 *     (كل تبويب يحمل رقمه، والنقر يبدّل الرسم — لا بطاقات ضخمة)
 *   → سطر المقارنة بالفترة السابقة (اندمج هنا بدل الشارات المبعثرة)
 *   → الرسم الرئيسي بمحاور واضحة.
 * حُذفت عمداً: بطاقات الملخص الكبيرة، توزيع الحالات، أفضل الخدمات،
 * مقارنة العمال، وعمود «الوقت الفعلي» — التحليلات التشغيلية انتقلت إلى التقارير.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardData } from './DashboardContainer';
import UnifiedChart from './UnifiedChart';
import FilterSelect from './FilterSelect';
import { fmtValue, computeComparisons, CHART_METRICS, CHART_TIMELINES } from './engine';

export default function AnalyticsPanel() {
  const ctx = useDashboardData() || {};
  const { orders = [], metric = 'revenue', timeline = 'week' } = ctx;
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});

  const comp = useMemo(() => computeComparisons(orders, timeline), [orders, timeline]);
  const periodText = comp.allTime ? 'كامل المدة' : comp.days === 1 ? 'اليوم' : `آخر ${comp.days} يومًا`;
  const active = comp[metric] || comp.revenue;
  const up = (active?.growth || 0) >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full space-y-5">
      {/* Context statement + period dropdown (كامل المدة included) */}
      <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-lg font-bold leading-snug text-slate-900">
          حصدت مركزك <span className="tabular-nums" dir="ltr">{comp.sales.value.toLocaleString('en-US')}</span> عملية خلال {periodText}.
        </div>
        <FilterSelect label="الفترة" options={CHART_TIMELINES} value={timeline} onChange={setTimeline} />
      </div>

      {/* The chart panel — YT-style: metric tabs on top, comparison line, canvas */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Metric tabs — كل تبويب يحمل اسمه ورقمه، النشط بخط سفلي */}
        <div className="grid grid-cols-2 border-b border-slate-200 sm:grid-cols-4">
          {CHART_METRICS.map((m) => {
            const d = comp[m.key] || { value: 0 };
            const on = metric === m.key;
            return (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`relative px-4 py-4 text-center transition-colors sm:py-5 ${on ? 'bg-white' : 'bg-slate-50/60 hover:bg-white'}`}>
                <div className={`text-[13px] ${on ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>{m.label}</div>
                <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${on ? 'text-slate-900' : 'text-slate-400'}`} dir="ltr">
                  {fmtValue(d.value, m.unit)}
                </div>
                {on && <span className="absolute inset-x-6 bottom-0 h-[3px] rounded-full bg-blue-600" />}
              </button>
            );
          })}
        </div>

        {/* Comparison line — moved INTO the chart header (كما طلبت) */}
        {!comp.allTime && (
          <div className="flex items-center gap-1.5 px-6 pt-5 text-xs">
            {up
              ? <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600"><ArrowUpRight size={14} /><span dir="ltr">{Math.abs(active?.growth || 0)}%</span></span>
              : <span className="inline-flex items-center gap-0.5 font-bold text-rose-600"><ArrowDownRight size={14} /><span dir="ltr">{Math.abs(active?.growth || 0)}%</span></span>}
            <span className="font-semibold text-slate-400">مقارنةً بالأيام الـ {comp.days} السابقة</span>
          </div>
        )}

        {/* Master chart — clear YT-grade axes */}
        <UnifiedChart bare />
      </div>
    </motion.div>
  );
}
