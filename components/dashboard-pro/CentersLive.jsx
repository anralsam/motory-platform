'use client';

/**
 * CentersLive — «المراكز لايف» (admin console).
 * Deep real-time drill-down over every center on the platform:
 *   • right rail: centers ranked by live load, with pulsing live counters.
 *   • main area: the selected center's three live streams — العمليات المباشرة،
 *     تسجيل العمال، الحوالات (platform_billing settlements).
 * Polls the admin-gated getCentersLive() server action every REFRESH_MS and
 * renders a per-second "آخر تحديث قبل N ث" ticker — YouTube-Studio realtime
 * card parity ("يتم التحديث مباشرة").
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, UserPlus, Banknote, RefreshCw } from 'lucide-react';
import { getCentersLive } from '@/app/dashboard-pro/actions';
import StatusPill from './StatusPill';

const REFRESH_MS = 8000;
const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

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

export default function CentersLive() {
  const [snap, setSnap] = useState(null);      // { at, centers }
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [, forceTick] = useState(0);           // 1s re-render for the "قبل N ث" ticker
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

  const centers = snap?.centers || [];
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
    <div className="space-y-4">
      {/* Live status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <span className="text-sm font-bold text-slate-900">يتم التحديث مباشرة</span>
          <span className="text-xs font-medium text-slate-400" dir="rtl">آخر تحديث {timeAgo(snap.at)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span>مراكز نشطة: <span className="font-mono tabular-nums text-slate-900" dir="ltr">{centers.length}</span></span>
          <span>عمليات حيّة الآن: <span className="font-mono tabular-nums text-emerald-600" dir="ltr">{centers.reduce((s, c) => s + c.live, 0)}</span></span>
          <span>بالانتظار: <span className="font-mono tabular-nums text-amber-600" dir="ltr">{centers.reduce((s, c) => s + c.pending, 0)}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
        {/* ── Centers rail ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-1">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">المراكز حسب الضغط الحيّ</div>
          <div className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
            {centers.map((c) => {
              const on = active?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelected(c.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors ${on ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${on ? 'font-bold text-blue-700' : 'font-semibold text-slate-900'}`}>{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <span className="font-mono tabular-nums" dir="ltr">{c.todayOps}</span> عملية اليوم
                      {c.frozen && <span className="rounded-full bg-rose-50 px-1.5 text-[10px] font-bold text-rose-600">مجمّد</span>}
                      {c.audit && <span className="rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-600">تدقيق</span>}
                    </div>
                  </div>
                  {c.live > 0
                    ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-emerald-600" dir="ltr"><LiveDot />{c.live}</span>
                    : <span className="font-mono text-xs tabular-nums text-slate-300" dir="ltr">0</span>}
                </button>
              );
            })}
            {!centers.length && <div className="grid place-items-center py-12 text-xs text-slate-400">لا توجد مراكز بعد</div>}
          </div>
        </div>

        {/* ── Selected center streams ── */}
        <div className="space-y-4 lg:col-span-3">
          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div>
                  <div className="text-base font-bold text-slate-900">{active.name}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-400">تفاصيل المركز الحيّة — عمليات · توظيف · حوالات</div>
                </div>
                <div className="flex items-center gap-5">
                  {[['حيّة الآن', active.live, 'text-emerald-600'], ['بالانتظار', active.pending, 'text-amber-600'], ['عمليات اليوم', active.todayOps, 'text-slate-900'], ['إيراد اليوم', sar(active.todayRevenue), 'text-slate-900']].map(([l, v, tone]) => (
                    <div key={l} className="text-center">
                      <div className={`font-mono text-lg font-bold tabular-nums ${tone}`} dir="ltr">{v}</div>
                      <div className="text-[10px] font-semibold text-slate-400">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Operations stream */}
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

                {/* Hires stream */}
                <StreamCard icon={UserPlus} title="تسجيل العمال" empty="لا يوجد عمال مسجّلون">
                  {active.hires.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{(h.name || '؟').charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{h.name}</div>
                        <div className="text-[11px] font-medium text-slate-400">{timeAgo(h.at)}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${h.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {h.status === 'active' ? 'نشط' : h.status}
                      </span>
                    </div>
                  ))}
                </StreamCard>

                {/* Transfers / settlements stream */}
                <StreamCard icon={Banknote} title="الحوالات والتسويات" empty="لا توجد حوالات مسجّلة">
                  {active.transfers.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900" dir="ltr">{sar(t.amount)}</div>
                        <div className="text-[11px] font-medium text-slate-400" dir="ltr">{t.period}</div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
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
