'use client';

/**
 * CentersLive — «المتابعة الحية» (الإدارة العليا) — v2 عالمية النمط.
 * الترتيب من الأعلى للأسفل:
 *   ① تبويبات النشاط: الكل · مراكز تغيير الزيت · مغاسل السيارات · … (تُشتق
 *     تلقائياً من أنشطة المراكز الفعلية) — كل ما تحتها يُفلتَر بها.
 *   ② إحصاءات اليوم للنشاط المختار: بالانتظار الآن · تحت الخدمة · اكتملت
 *     اليوم · إيرادات اليوم · عمولة المنصة اليوم.
 *   ③ رسم بياني نظيف (عمليات اليوم بالساعة) — بدل الحوسة.
 *   ④ قائمة المراكز بنبض حي → تفاصيل المركز المختار (عمليات · توظيف · حوالات).
 * تحديث تلقائي كل 8 ثوانٍ + عدّاد بالثواني. متوافق مع الجوال بالكامل.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity, UserPlus, Banknote, RefreshCw } from 'lucide-react';
import { getCentersLive } from '@/app/dashboard-pro/actions';
import StatusPill from './StatusPill';

const REFRESH_MS = 8000;
const COMMISSION = 0.004; // 0.4%
const sar = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ⃀`;

function timeAgo(iso) {
  if (!iso) return '—';
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `قبل ${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return new Date(iso).toLocaleDateString('ar-SA');
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function StreamCard({ icon: Icon, title, children, empty }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <Icon size={16} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-900">{title}</span>
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {children?.length ? children : <div className="grid place-items-center py-10 text-xs font-medium text-slate-400">{empty}</div>}
      </div>
    </div>
  );
}

function HourlyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl">
      <span dir="ltr">{label}</span> · {payload[0].value} عملية
    </div>
  );
}

export default function CentersLive() {
  const [snap, setSnap] = useState(null);           // { at, centers, todayOrders }
  const [typeTab, setTypeTab] = useState('all');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [, forceTick] = useState(0);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await getCentersLive();
      if (res?.ok) { setSnap(res); setError(null); }
      else setError(res?.error || 'تعذّر تحميل البث');
    } catch { setError('تعذّر الاتصال بالخادم'); }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(tick); };
  }, [load]);

  const allCenters = snap?.centers || [];

  // ── ① تبويبات النشاط (مشتقة من الواقع) ──
  const typeTabs = useMemo(() => {
    const counts = {};
    allCenters.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return [{ key: 'all', label: 'كل الأنشطة', count: allCenters.length },
      ...Object.entries(counts).map(([k, n]) => ({ key: k, label: k, count: n }))];
  }, [allCenters]);

  const centers = useMemo(
    () => (typeTab === 'all' ? allCenters : allCenters.filter((c) => c.type === typeTab)),
    [allCenters, typeTab],
  );
  const centerIds = useMemo(() => new Set(centers.map((c) => c.id)), [centers]);

  // ── ② إحصاءات اليوم للنشاط المختار ──
  const stats = useMemo(() => {
    const pending = centers.reduce((s, c) => s + c.pending, 0);
    const live = centers.reduce((s, c) => s + c.live, 0);
    const done = centers.reduce((s, c) => s + c.todayOps, 0);           // عمليات اليوم (منشأة)
    const completedToday = centers.reduce((s, c) => s + (c.completedToday || 0), 0);
    const revenue = centers.reduce((s, c) => s + c.todayRevenue, 0);
    return { pending, live, done, completedToday, revenue, commission: Math.round(revenue * COMMISSION) };
  }, [centers]);

  // ── ③ سلسلة اليوم بالساعات (مفلترة بالنشاط) ──
  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, value: 0 }));
    (snap?.todayOrders || []).forEach((o) => {
      if (typeTab !== 'all' && !centerIds.has(o.merchant_id)) return;
      if (o.hour >= 0 && o.hour < 24) arr[o.hour].value += 1;
    });
    return arr;
  }, [snap, typeTab, centerIds]);

  const active = useMemo(
    () => centers.find((c) => c.id === selected) || centers[0] || null,
    [centers, selected],
  );

  if (error && !snap) {
    return <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">{error}</div>;
  }
  if (!snap) {
    return (
      <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400"><RefreshCw size={15} className="animate-spin" /> جارٍ فتح البث المباشر…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ① Activity tabs */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 no-scrollbar">
        {typeTabs.map((t) => {
          const on = typeTab === t.key;
          return (
            <button key={t.key} onClick={() => { setTypeTab(t.key); setSelected(null); }} className="relative -mb-px flex-none pb-3 pt-1">
              <span className={`whitespace-nowrap text-sm transition-colors ${on ? 'font-bold text-slate-900' : 'font-semibold text-slate-500 hover:text-slate-800'}`}>
                {t.label} <span className="font-medium text-slate-400" dir="ltr">({t.count})</span>
              </span>
              {on && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-slate-900" />}
            </button>
          );
        })}
        <span className="ms-auto hidden flex-none items-center gap-2 pb-2 sm:flex">
          <LiveDot /><span className="text-xs font-semibold text-slate-400">آخر تحديث {timeAgo(snap.at)}</span>
        </span>
      </div>

      {/* ② Today stats — للنشاط المختار */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-5">
        {[
          ['بالانتظار الآن', stats.pending.toLocaleString('en-US'), 'text-amber-600'],
          ['تحت الخدمة الآن', stats.live.toLocaleString('en-US'), 'text-blue-600'],
          ['اكتملت اليوم', stats.completedToday.toLocaleString('en-US'), 'text-emerald-600'],
          ['إيرادات اليوم', sar(stats.revenue), 'text-slate-900'],
          ['عمولة المنصة اليوم', sar(stats.commission), 'text-slate-900'],
        ].map(([l, v, tone]) => (
          <div key={l} className="bg-white px-4 py-4 sm:px-5">
            <div className="text-[11px] font-semibold text-slate-400">{l}</div>
            <div className={`mt-1.5 truncate text-xl font-bold tabular-nums sm:text-2xl ${tone}`} dir="ltr">{v}</div>
          </div>
        ))}
      </div>

      {/* ③ Hourly chart — عمليات اليوم بالساعة */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">إيقاع اليوم</div>
            <div className="mt-0.5 text-xs font-medium text-slate-400">العمليات الجديدة لكل ساعة{typeTab !== 'all' ? ` — ${typeTab}` : ' — كل الأنشطة'}</div>
          </div>
          <span className="text-xs font-bold text-slate-500"><span className="tabular-nums" dir="ltr">{stats.done}</span> عملية اليوم</span>
        </div>
        <div className="mt-4 h-48 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourly} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} horizontal stroke="#eceef1" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} tick={{ fill: '#606060', fontSize: 11, fontWeight: 500 }} minTickGap={26} />
              <YAxis axisLine={false} tickLine={false} tickCount={4} tick={{ fill: '#606060', fontSize: 11, fontWeight: 500 }} allowDecimals={false} domain={[0, (m) => (m > 0 ? m : 4)]} />
              <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }} content={<HourlyTooltip />} />
              <Area type="linear" dataKey="value" stroke="none" fill="#e3f2fd" fillOpacity={1} isAnimationActive animationDuration={350} />
              <Line type="linear" dataKey="value" stroke="#1a73e8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#1a73e8', stroke: '#fff', strokeWidth: 2 }} isAnimationActive animationDuration={350} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ④ Centers rail + selected center streams */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-1">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">المراكز حسب النشاط</span>
            <select value={typeTab} onChange={(e) => { setTypeTab(e.target.value); setSelected(null); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none transition focus:border-slate-900">
              {typeTabs.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.count})</option>)}
            </select>
          </div>
          <div className="flex max-h-[220px] flex-row divide-x divide-x-reverse divide-slate-100 overflow-x-auto lg:max-h-[560px] lg:flex-col lg:divide-x-0 lg:divide-y lg:overflow-y-auto">
            {centers.map((c) => {
              const on = active?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelected(c.id)}
                  className={`flex w-56 flex-none items-center gap-3 px-4 py-3 text-start transition-colors lg:w-full ${on ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${on ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <span className="truncate">{c.type}</span>
                      {c.branchCount > 1 && <span className="flex-none rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{c.branchCount} فروع</span>}
                      {c.frozen && <span className="flex-none rounded-full bg-rose-50 px-1.5 text-[10px] font-bold text-rose-600">مجمّد</span>}
                    </div>
                  </div>
                  {c.live > 0
                    ? <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-600" dir="ltr"><LiveDot />{c.live}</span>
                    : <span className="flex-none text-xs tabular-nums text-slate-300" dir="ltr">0</span>}
                </button>
              );
            })}
            {!centers.length && <div className="grid w-full place-items-center py-12 text-xs text-slate-400">لا توجد مراكز في هذا النشاط</div>}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-3">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-slate-900">{active.name}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-400">{active.type} · تفاصيل حيّة — عمليات · توظيف · حوالات</div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[['حيّة الآن', active.live, 'text-emerald-600'], ['بالانتظار', active.pending, 'text-amber-600'], ['عمليات اليوم', active.todayOps, 'text-slate-900'], ['إيراد اليوم', sar(active.todayRevenue), 'text-slate-900']].map(([l, v, tone]) => (
                    <div key={l} className="text-center">
                      <div className={`text-lg font-bold tabular-nums ${tone}`} dir="ltr">{v}</div>
                      <div className="text-[10px] font-semibold text-slate-400">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <StreamCard icon={Activity} title="العمليات المباشرة" empty="لا توجد عمليات">
                  {active.ops.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{o.service}</div>
                        <div className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                          {o.customer}{o.plate ? <span dir="ltr"> · {o.plate}</span> : ''}{o.tech ? ` · ${o.tech}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <StatusPill status={o.status} />
                        <span className="text-[10px] font-medium text-slate-400">{timeAgo(o.at)}</span>
                      </div>
                    </div>
                  ))}
                </StreamCard>

                <StreamCard icon={UserPlus} title="تسجيل العمال" empty="لا يوجد عمال مسجّلون">
                  {active.hires.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{(h.name || '؟').charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{h.name}</div>
                        <div className="text-[11px] font-medium text-slate-400">{timeAgo(h.at)}</div>
                      </div>
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${h.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {h.status === 'active' ? 'نشط' : h.status}
                      </span>
                    </div>
                  ))}
                </StreamCard>

                <StreamCard icon={Banknote} title="الحوالات والتسويات" empty="لا توجد حوالات مسجّلة">
                  {active.transfers.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold tabular-nums text-slate-900" dir="ltr">{sar(t.amount)}</div>
                        <div className="text-[11px] font-medium text-slate-400" dir="ltr">{t.period}</div>
                      </div>
                      <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {t.status === 'paid' ? 'تمّت' : 'بانتظار التحويل'}
                      </span>
                    </div>
                  ))}
                </StreamCard>
              </div>
            </>
          ) : (
            <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-400">اختر مركزًا لعرض بثّه المباشر</div>
          )}
        </div>
      </div>
    </div>
  );
}
