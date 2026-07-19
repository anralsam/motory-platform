'use client';

/**
 * WorkforcePanel — technician leaderboard + cross-branch labor engine.
 * Reads natively from the unified matrix context (orders + workers, already sliced
 * to the active branch). Ranks technicians by closed-operation volume, shows soft
 * efficiency badges, and offers an inline branch-transfer popup wired to the
 * centralized optimistic transferWorker action (sub-100ms; the tech leaves the
 * filtered cluster instantly). Clean YouTube-Studio micro-table aesthetics, RTL.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Check, Gauge, Hash } from 'lucide-react';
import { useDashboardData, useActions } from './DashboardContainer';
import { computeWorkforce, fmtDuration } from './engine';

export default function WorkforcePanel() {
  const { orders = [], workers = [], branches = [], permissions = {} } = useDashboardData() || {};
  const { transferWorker } = useActions() || {};
  const canTransfer = permissions.canTransfer !== false;
  const [openId, setOpenId] = useState(null);
  const [sortBy, setSortBy] = useState('volume'); // 'volume' | 'speed'

  // Duration-aware per-technician matrix (ready−started production speed).
  const base = useMemo(() => computeWorkforce(orders, workers), [orders, workers]);
  const rows = useMemo(() => {
    const arr = [...base];
    if (sortBy === 'speed') {
      // Fastest first; technicians with no measured speed sink to the bottom.
      arr.sort((a, b) => (a.avgProdMin ?? Infinity) - (b.avgProdMin ?? Infinity) || b.completed - a.completed);
    } else {
      arr.sort((a, b) => b.completed - a.completed || b.total - a.total);
    }
    return arr;
  }, [base, sortBy]);

  const maxCompleted = Math.max(1, ...rows.map((r) => r.completed));

  return (
    <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-bold tracking-tight text-slate-900">مصفوفة أداء الفنّيين</div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button onClick={() => setSortBy('volume')}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${sortBy === 'volume' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            <Hash size={12} /> الأكثر إنجازاً
          </button>
          <button onClick={() => setSortBy('speed')}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${sortBy === 'speed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            <Gauge size={12} /> الأسرع
          </button>
        </div>
      </div>
      <div className="mb-6 text-sm font-medium text-slate-500">متوسط سرعة الإنجاز = زمن العمل الفعلي (من «بدء العمل» إلى «جاهزة»).</div>

      {rows.length === 0 ? (
        <div className="py-16 text-center text-sm font-medium text-slate-400">لا يوجد فنيون مكلّفون بهذا الفرع حالياً</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.user_id} className="group flex items-center gap-4 rounded-xl px-3 py-3 transition-all duration-200 hover:scale-[1.005] hover:bg-slate-50">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-500" dir="ltr">{i + 1}</span>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{r.full_name || 'فنّي'}</span>
                  <div className="flex flex-none items-center gap-3">
                    {/* Metric B — average production speed (ready − started) */}
                    <span className="inline-flex items-baseline gap-1" title="متوسط سرعة الإنجاز (زمن العمل الفعلي)">
                      <Gauge size={13} className="translate-y-0.5 text-slate-400" />
                      <span className="font-mono text-sm font-bold tabular-nums text-slate-900" dir="ltr">{r.avgProdMin != null ? fmtDuration(r.avgProdMin) : '—'}</span>
                    </span>
                    {/* Metric C — active in_progress load */}
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600" title="الحمل النشط (قيد العمل الآن)">{r.active} نشطة</span>
                    {/* Metric A — completed tasks */}
                    <span className="font-mono text-sm font-black tabular-nums text-slate-900" dir="ltr" title="عدد المهام المنجزة">{r.completed}</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(3, Math.round((r.completed / maxCompleted) * 100))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 * i }}
                    className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600" />
                </div>
              </div>

              {/* Transfer engine — gated by can_transfer_staff */}
              {canTransfer && branches.length > 0 && transferWorker && (
                <div className="relative flex-none">
                  <button onClick={() => setOpenId(openId === r.user_id ? null : r.user_id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600">
                    <ArrowLeftRight size={13} /> نقل الفرع
                  </button>
                  <AnimatePresence>
                    {openId === r.user_id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenId(null)} />
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-0 z-50 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-md" dir="rtl">
                          <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold text-slate-400">نقل إلى فرع</div>
                          {branches.map((b) => {
                            const on = r.branch_id === b.id;
                            return (
                              <button key={b.id} disabled={on} onClick={() => { transferWorker(r.user_id, b.id); setOpenId(null); }}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${on ? 'cursor-default font-bold text-blue-600' : 'font-medium text-slate-700 hover:bg-slate-50'}`}>
                                <span className="truncate">{b.name}{b.is_primary ? ' · رئيسي' : ''}</span>
                                {on && <Check size={14} strokeWidth={3} />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
