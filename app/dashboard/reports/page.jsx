'use client';
import { useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { usePermissions } from '@/lib/usePermissions';
import Forbidden403 from '@/components/Forbidden403';
import { useCompletedOps } from '@/lib/useReports';
import { useReportMetrics } from '@/lib/useReportMetrics';
import SalesOpsChart from '@/components/SalesOpsChart';
import LiveBranchBoard from '@/components/LiveBranchBoard';
import DashboardContainer from '@/components/dashboard-pro/dna/DashboardContainer';
import WorkforcePanel from '@/components/dashboard-pro/dna/WorkforcePanel';
import { useDashboard } from '@/lib/useDashboard';
import Toast from '@/components/Toast';

/* ── Tier B: Operational & bottleneck analysis ── */
const OPS_ANALYSIS = [
  { tone: 'rose', title: 'اختناق تشغيلي', text: "خدمة 'تغيير الزيت' تستهلك 45 دقيقة بالمتوسط — أعلى من المستهدف (30 دقيقة)، ما يبطئ دوران الطلبات." },
  { tone: 'blue', title: 'ركود صباحي', text: 'انخفاض ملحوظ في المبيعات يوم الثلاثاء بين 9 ص و12 م مقارنة ببقية أيام الأسبوع.' },
  { tone: 'amber', title: 'ضغط في الذروة', text: 'يوم الجمعة يسجّل أعلى إقبال مع نقص في عدد الفنيين المتاحين، ما يرفع زمن الانتظار.' },
];

/* ── Tier C: Strategic recommendations ── */
const RECOMMENDATIONS = [
  { text: 'أطلق عرضاً ترويجياً صباح الثلاثاء (9–12) لرفع الإشغال في وقت الركود.', cta: 'إنشاء عرض' },
  { text: 'أضف فنياً إضافياً لمناوبة الجمعة لتقليل زمن الانتظار خلال الذروة.', cta: 'إدارة المناوبات' },
  { text: 'راجع سير عمل «تغيير الزيت» لخفض المتوسط من 45 إلى 30 دقيقة (~33% أسرع).', cta: 'مراجعة الأداء' },
];

const OPS_TONES = {
  blue: { card: 'bg-blue-50/50 border-blue-100', ic: 'bg-blue-100 text-blue-600' },
  amber: { card: 'bg-amber-50/50 border-amber-100', ic: 'bg-amber-100 text-amber-600' },
  rose: { card: 'bg-rose-50/50 border-rose-100', ic: 'bg-rose-100 text-rose-600' },
};

function fmt(n) { return Number(n || 0).toLocaleString('en'); }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('en-GB'); } catch { return '—'; } }

export default function ReportsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const { canViewFinancials } = usePermissions();
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const branchName = selectedId === 'all' ? 'كل الفروع' : (branches.find((b) => b.id === selectedId)?.name || 'فرع');

  const { rows, loading, error } = useCompletedOps(user?.id, selectedId);
  const { metrics, series, loading: metricsLoading } = useReportMetrics(user?.id, selectedId);
  const { orders: teamOrders, workers: teamWorkers } = useDashboard(user?.id, selectedId);
  const [view, setView] = useState('live'); // live | overview | team | ai | log

  const summary = useMemo(() => {
    const count = rows.length;
    const total = rows.reduce((s, r) => s + r.total, 0);
    return { count, total, avg: count ? Math.round(total / count) : 0 };
  }, [rows]);

  // ── Toast ──
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2800);
  }

  // ── 25th-of-month time gate for the monthly AI report ──
  const today = new Date();
  const isReportDay = today.getDate() === 25;
  function exportMonthlyReport() {
    if (!isReportDay) return;
    showToast('تم إصدار تقرير الذكاء الاصطناعي الشهري');
    setTimeout(() => window.print(), 350);
  }

  // ── Standard export (CSV real / PDF print-mock) ──
  const [exportOpen, setExportOpen] = useState(false);
  function exportCSV() {
    const header = ['التاريخ', 'رقم العملية', 'العميل', 'الخدمة', 'الإجمالي'];
    const lines = rows.map((r) => [fmtDate(r.date), r.ref, r.customer, r.service, r.total]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => { const s = String(c ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `voldmotor-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('تم تصدير CSV');
  }
  function exportPDF() { showToast('جارٍ تجهيز PDF…', 'info'); setTimeout(() => window.print(), 350); }

  // Financial route — gated by can_view_financials (owners always pass).
  if (!canViewFinancials) return <Forbidden403 title="صفحة مالية محظورة — 403" hint="التقارير المالية متاحة لمن يملك صلاحية «عرض المالية». تواصل مع مالك المركز." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">التقارير وتحليل الذكاء الاصطناعي</h1>
          <p className="mt-1 text-sm text-slate-500">نطاق التحليل: <span className="font-bold text-slate-700">{branchName}</span></p>
        </div>
      </div>

      {/* ── Ordered navigation: each block gets its own tab (no more one long scroll) ── */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        {[['live', 'المتابعة الحية'], ['overview', 'نظرة عامة'], ['team', 'تحليل الفريق'], ['ai', 'التحليل الذكي'], ['log', 'سجل العمليات']].map(([k, label]) => {
          const on = view === k;
          return (
            <button key={k} onClick={() => setView(k)} className="relative -mb-px pb-3 pt-1">
              <span className={`text-sm transition-colors ${on ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-500 hover:text-slate-800'}`}>{label}</span>
              {on && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-slate-900" />}
            </button>
          );
        })}
      </div>

      {view === 'live' && <LiveBranchBoard centerId={user?.id} />}

      {view === 'team' && (
        <DashboardContainer role="merchant" orders={teamOrders || []} workers={teamWorkers || []}>
          <WorkforcePanel />
        </DashboardContainer>
      )}

      {view === 'overview' && (<>
      {/* Summary KPIs FIRST — the numbers before the curves */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI label="العمليات المنجزة" value={loading ? '—' : fmt(summary.count)} />
        <KPI label="إجمالي المبيعات" value={loading ? '—' : fmt(summary.total)} suffix="⃁" accent="text-emerald-600" />
        <KPI label="متوسط الفاتورة" value={loading ? '—' : fmt(summary.avg)} suffix="⃁" accent="text-blue-600" />
      </div>

      {/* ════════ Sales vs Operations trend (current month) ════════ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">حجم المبيعات مقابل الطلبات المنجزة</h3>
            <p className="text-xs text-slate-500">{branchName} · الشهر الحالي</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> حجم المبيعات</span>
            <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> الطلبات المنجزة</span>
          </div>
        </div>
        {metricsLoading ? (
          <div className="grid h-72 place-items-center text-sm text-slate-400">جاري تحميل المخطط...</div>
        ) : series.length === 0 ? (
          <div className="grid h-72 place-items-center text-sm text-slate-400">لا توجد بيانات لهذا الشهر</div>
        ) : (
          <SalesOpsChart data={series} />
        )}
      </section>
      </>)}

      {view === 'ai' && (
      /* ════════ Monthly AI Performance Report (executive consultant view) ════════ */
      <section className="rounded-3xl border border-transparent bg-gradient-to-br from-violet-100 via-white to-blue-100 p-[1.5px] shadow-sm">
        <div className="rounded-3xl bg-white/80 p-5 backdrop-blur sm:p-6">
          {/* Header + monthly export gate */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-lg">
                <Sparkle />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">تقرير الأداء الشهري — تحليل النظام الذكي</h2>
                <p className="text-xs text-slate-500">مستشارك الافتراضي · تحليل مقارن لأداء {branchName}</p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-1.5 lg:items-end">
              <button
                onClick={exportMonthlyReport}
                disabled={!isReportDay}
                className={
                  isReportDay
                    ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-300 transition hover:brightness-110'
                    : 'inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3 text-sm font-extrabold text-white opacity-50'
                }
              >
                <Sparkle size={15} />
                إصدار تقرير الذكاء الاصطناعي الشهري
              </button>
              {!isReportDay && (
                <p className="text-center text-xs font-semibold text-slate-500 lg:text-end">
                  ⏳ يتاح إصدار التقرير الشهري المفصل في يوم 25 من كل شهر ميلادي
                </p>
              )}
            </div>
          </div>

          {/* ── Tier A: Performance comparisons (MoM) ── */}
          <TierLabel n="1" title="مقارنات الأداء" sub="مقارنة فعلية بالشهر الماضي (شهر مقابل شهر)" />
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metricsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
              ))
            ) : metrics.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                لا توجد بيانات كافية لهذا الفرع لحساب المقارنة الشهرية بعد.
              </div>
            ) : (
              metrics.map((m, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">{m.label}</div>
                  <div className="mt-1.5 text-xl font-extrabold text-slate-900">{m.value}</div>
                  <TrendBadge tone={m.tone} dir={m.dir} text={m.delta} />
                </div>
              ))
            )}
          </div>

          {/* ── Tier B: Operational & bottleneck analysis ── */}
          <TierLabel n="2" title="تحليل العمليات والركود" sub="أين تضيع الكفاءة هذا الشهر" />
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {OPS_ANALYSIS.map((o, i) => {
              const t = OPS_TONES[o.tone];
              return (
                <div key={i} className={`flex flex-col gap-2 rounded-2xl border p-4 ${t.card}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${t.ic}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
                  </span>
                  <div className="text-sm font-extrabold text-slate-900">{o.title}</div>
                  <p className="text-sm leading-relaxed text-slate-600">{o.text}</p>
                </div>
              );
            })}
          </div>

          {/* ── Tier C: Strategic recommendations ── */}
          <TierLabel n="3" title="التوصيات الاستراتيجية" sub="خطوات قابلة للتنفيذ لرفع الربحية" />
          <div className="space-y-2.5">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">{i + 1}</span>
                <p className="flex-1 text-sm font-semibold text-slate-700">{r.text}</p>
                <button className="flex-none rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-50">{r.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {view === 'log' && (
      /* ════════ Standard reports — العمليات المنجزة + التصدير ════════ */
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">الفواتير والعمليات المنجزة</h3>
            <p className="text-xs text-slate-500">{branchName} · آخر 100 عملية</p>
          </div>
          <div className="relative">
            <button onClick={() => setExportOpen((o) => !o)} className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              تصدير PDF/CSV
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {exportOpen && (
              <div className="absolute end-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button onClick={() => { setExportOpen(false); exportCSV(); }} className="block w-full px-4 py-2.5 text-start text-sm font-bold text-slate-700 hover:bg-slate-50">تصدير CSV</button>
                <button onClick={() => { setExportOpen(false); exportPDF(); }} className="block w-full px-4 py-2.5 text-start text-sm font-bold text-slate-700 hover:bg-slate-50">تصدير PDF</button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">التاريخ</th>
                <th className="px-5 py-3 text-start">رقم العملية</th>
                <th className="px-5 py-3 text-start">العميل</th>
                <th className="px-5 py-3 text-start">الخدمة</th>
                <th className="px-5 py-3 text-start">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">لا توجد عمليات في هذا الفرع بعد</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="text-sm transition hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-700">#{r.ref}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{r.customer}</td>
                    <td className="px-5 py-3 text-slate-600">{r.service}</td>
                    <td className="px-5 py-3 font-extrabold text-brand">{fmt(r.total)} ⃁</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      <Toast toast={toast} />
    </div>
  );
}

function TierLabel({ n, title, sub }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-violet-600 text-xs font-extrabold text-white">{n}</span>
      <div>
        <span className="text-sm font-extrabold text-slate-900">{title}</span>
        {sub && <span className="ms-2 text-xs text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

function TrendBadge({ tone, dir, text }) {
  const cls =
    tone === 'good' ? 'bg-emerald-50 text-emerald-700'
    : tone === 'bad' ? 'bg-rose-50 text-rose-700'
    : 'bg-slate-100 text-slate-600';
  const arrow =
    dir === 'up' ? 'M12 19V5M5 12l7-7 7 7'
    : dir === 'down' ? 'M12 5v14M5 12l7 7 7-7'
    : 'M5 12h14';
  return (
    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d={arrow} /></svg>
      {text}
    </span>
  );
}

function KPI({ label, value, suffix, accent = 'text-slate-900' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-extrabold tabular-nums ${accent}`}>
        {value}{suffix ? <span className="text-sm font-bold text-slate-400"> {suffix}</span> : null}
      </div>
    </div>
  );
}

function Sparkle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17l-2.6.9L19 20l-.9-2.1L15.5 17l2.6-.4L19 14z" opacity="0.7" />
    </svg>
  );
}
