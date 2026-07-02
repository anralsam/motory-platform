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
import { fmtValue, computeComparisons, timelineRangeText, CHART_METRICS, CHART_TIMELINES } from './engine';

export default function AnalyticsPanel() {
  const ctx = useDashboardData() || {};
  const { orders = [], metric = 'revenue', timeline = 'week' } = ctx;
  const setMetric = ctx.setMetric || (() => {});
  const setTimeline = ctx.setTimeline || (() => {});

  const comp = useMemo(() => computeComparisons(orders, timeline), [orders, timeline]);
  const periodText = comp.allTime ? 'كامل المدة' : comp.days === 1 ? 'اليوم' : `آخر ${comp.days} يومًا`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full space-y-5">
      {/* Context statement + period dropdown (كامل المدة included) */}
      <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-lg font-bold leading-snug text-slate-900">
          حصدت مركزك <span className="tabular-nums" dir="ltr">{comp.sales.value.toLocaleString('en-US')}</span> عملية خلال {periodText}.
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <FilterSelect label="الفترة" options={CHART_TIMELINES} value={timeline} onChange={setTimeline} />
          <span className="text-[11px] font-semibold text-slate-400">{timelineRangeText(timeline, orders)}</span>
        </div>
      </div>

      {/* The chart panel — YT-style: metric tabs on top, comparison line, canvas */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Metric tabs — كل تبويب يحمل اسمه ورقمه، النشط بخط سفلي */}
        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-slate-200 border-b border-slate-200 sm:grid-cols-4">
          {CHART_METRICS.map((m) => {
            const d = comp[m.key] || { value: 0, growth: 0 };
            const on = metric === m.key;
            const tUp = (d.growth || 0) >= 0;
            return (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`relative px-4 py-4 text-center transition-colors sm:py-5 ${on ? 'bg-white' : 'bg-slate-50/70 hover:bg-white'}`}>
                <div className={`text-[12px] ${on ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>{m.label}</div>
                <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${on ? 'text-slate-900' : 'text-slate-400'}`} dir="ltr">
                  {fmtValue(d.value, m.unit)}
                </div>
                {!comp.allTime && (
                  <div className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-bold ${tUp ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                    {tUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(d.growth || 0)}%
                  </div>
                )}
                {on && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-blue-600" />}
              </button>
            );
          })}
        </div>

        {/* Master chart — clear YT-grade axes */}
        <UnifiedChart bare />
      </div>
    </motion.div>
  );
}
