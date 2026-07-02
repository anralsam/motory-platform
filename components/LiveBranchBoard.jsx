'use client';

/**
 * LiveBranchBoard — «المتابعة الحية» داخل التقارير.
 * سؤال المالك الذي تجيب عنه هذه اللوحة حرفياً: «عندي ٣ فروع — الآن، في كل فرع،
 * كم سيارة بالانتظار؟ كم تحت الخدمة؟ وكم أُنجز اليوم؟».
 *  • بطاقة لكل فرع: انتظار (كهرماني) · تحت الخدمة (أزرق) · أُنجزت اليوم (أخضر)
 *    + متوسط زمن الانتظار الحالي للفرع (منذ إنشاء الطلبات المنتظرة).
 *  • شريط إجمالي أعلى + «أداء آخر ٤٨ ساعة» (انتقل هنا من الرئيسية).
 *  • يُحدَّث تلقائياً كل 15 ثانية مع عدّاد «آخر تحديث قبل N ث».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/lib/i18n';
import { useBranchStore } from '@/store/branchStore';
import { supabase } from '@/lib/supabaseClient';

const REFRESH_MS = 15000;

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function waitText(mins) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} د`;
  return `${Math.floor(mins / 60)} س ${mins % 60} د`;
}

export default function LiveBranchBoard({ centerId }) {
  const { t } = useT();
  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  useEffect(() => { loadBranches(); }, [loadBranches]);

  const [orders, setOrders] = useState(null);
  const [at, setAt] = useState(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    if (!centerId) return;
    const { data } = await supabase.from('orders')
      .select('id, status, branch_id, created_at, completed_at')
      .eq('merchant_id', centerId)
      .order('created_at', { ascending: false }).limit(600);
    setOrders(data || []);
    setAt(Date.now());
  }, [centerId]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    const s = setInterval(() => tick((n) => n + 1), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, [load]);

  const board = useMemo(() => {
    const o = orders || [];
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const rowsById = {};
    const rowOf = (id, name) => rowsById[id] || (rowsById[id] = { id, name, pending: 0, inService: 0, doneToday: 0, waitMins: [] });
    branches.forEach((b) => rowOf(b.id, b.name));
    o.forEach((x) => {
      const b = branches.find((y) => y.id === x.branch_id);
      const r = rowOf(x.branch_id || 'none', b?.name || 'بدون فرع');
      if (x.status === 'pending') {
        r.pending += 1;
        if (x.created_at) r.waitMins.push(Math.max(0, Math.round((Date.now() - new Date(x.created_at).getTime()) / 60000)));
      } else if (x.status === 'in_progress' || x.status === 'ready') {
        r.inService += 1;
      } else if (x.status === 'completed') {
        const t = x.completed_at || x.created_at;
        if (t && new Date(t) >= dayStart) r.doneToday += 1;
      }
    });
    const rows = Object.values(rowsById)
      .map((r) => ({ ...r, avgWait: r.waitMins.length ? Math.round(r.waitMins.reduce((a, b) => a + b, 0) / r.waitMins.length) : null }))
      .sort((a, b) => (b.pending + b.inService) - (a.pending + a.inService));
    const totals = rows.reduce((t, r) => ({ pending: t.pending + r.pending, inService: t.inService + r.inService, doneToday: t.doneToday + r.doneToday }), { pending: 0, inService: 0, doneToday: 0 });

    // {t('أداء آخر 48 ساعة', 'Last 48 hours')} — طلبات مُنشأة لكل ساعة
    const now = Date.now();
    const bars = Array.from({ length: 48 }, (_, i) => {
      const s = now - (47 - i) * 3600000;
      const e = s + 3600000;
      return o.filter((x) => { const t = x.created_at ? new Date(x.created_at).getTime() : 0; return t >= s && t < e; }).length;
    });
    return { rows, totals, bars, maxBar: Math.max(1, ...bars) };
  }, [orders, branches]);

  const secsAgo = at ? Math.max(0, Math.floor((Date.now() - at) / 1000)) : null;

  if (orders === null) {
    return <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-400">{t('جارٍ فتح المتابعة الحية…', 'Opening live view…')}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Live totals strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <LiveDot />
          <span className="text-sm font-bold text-slate-900">{t('المتابعة الحية لكل الفروع', 'Live view — all branches')}</span>
          {secsAgo != null && <span className="text-xs font-semibold text-slate-400">{t('آخر تحديث قبل', 'Updated')} {secsAgo} {t('ث', 's ago')}</span>}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <span className="font-semibold text-slate-500">{t('بالانتظار', 'Waiting')} <span className="ms-1 font-bold tabular-nums text-amber-600" dir="ltr">{board.totals.pending}</span></span>
          <span className="font-semibold text-slate-500">{t('تحت الخدمة', 'In service')} <span className="ms-1 font-bold tabular-nums text-blue-600" dir="ltr">{board.totals.inService}</span></span>
          <span className="font-semibold text-slate-500">{t('أُنجزت اليوم', 'Done today')} <span className="ms-1 font-bold tabular-nums text-emerald-600" dir="ltr">{board.totals.doneToday}</span></span>
        </div>
      </div>

      {/* Per-branch live cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {board.rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="truncate text-sm font-bold text-slate-900">{r.name}</div>
              {(r.pending + r.inService) > 0 ? <LiveDot /> : <span className="h-2 w-2 rounded-full bg-slate-200" />}
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-slate-100 text-center">
              <div>
                <div className="text-2xl font-bold tabular-nums text-amber-600" dir="ltr">{r.pending}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{t('بالانتظار', 'Waiting')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums text-blue-600" dir="ltr">{r.inService}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{t('تحت الخدمة', 'In service')}</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums text-emerald-600" dir="ltr">{r.doneToday}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{t('أُنجزت اليوم', 'Done today')}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold">
              <span className="text-slate-400">{t('متوسط انتظار الحالي', 'Current avg. wait')}</span>
              <span className={`tabular-nums ${r.avgWait != null && r.avgWait > 45 ? 'text-rose-600' : 'text-slate-700'}`} dir="ltr">{waitText(r.avgWait)}</span>
            </div>
          </div>
        ))}
        {!board.rows.length && (
          <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-sm text-slate-400">{t('لا توجد فروع بعد', 'No branches yet')}</div>
        )}
      </div>

      {/* 48h pulse — moved from the home page */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-slate-900">{t('أداء آخر 48 ساعة', 'Last 48 hours')}</div>
        <div className="mt-1 text-xs font-medium text-slate-400">{t('طلبات جديدة لكل ساعة — على مستوى كل الفروع', 'New orders per hour — across all branches')}</div>
        <div className="mt-4 flex h-24 items-end gap-px" dir="ltr">
          {board.bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-sm bg-blue-500/70" style={{ height: `${Math.max(4, Math.round((b / board.maxBar) * 100))}%` }} title={`${b}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
