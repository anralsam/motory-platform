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
import { ArrowLeftRight, Check } from 'lucide-react';
import { useDashboardData, useActions } from './DashboardContainer';

export default function WorkforcePanel() {
  const { orders = [], workers = [], branches = [], currentBranchId = 'all', permissions = {} } = useDashboardData() || {};
  const { transferWorker } = useActions() || {};
  const canTransfer = permissions.canTransfer !== false;
  const [openId, setOpenId] = useState(null);

  const statsByTech = useMemo(() => {
    const m = {};
    orders.forEach((o) => {
      if (!o.assigned_to) return;
      const s = m[o.assigned_to] || (m[o.assigned_to] = { total: 0, completed: 0, active: 0 });
      s.total++;
      if (o.status === 'completed') s.completed++;
      if (o.status === 'in_progress' || o.status === 'ready') s.active++;
    });
    return m;
  }, [orders]);

  const rows = useMemo(() => workers
    .map((w) => {
      const s = statsByTech[w.user_id] || { total: 0, completed: 0, active: 0 };
      return { ...w, ...s, eff: s.total ? Math.round((s.completed / s.total) * 100) : 0 };
    })
    .sort((a, b) => b.total - a.total), [workers, statsByTech]);

  const maxTotal = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-1 text-lg font-bold tracking-tight text-slate-900">إحصائيات مقارنة العمّال</div>
      <div className="mb-6 text-sm font-medium text-slate-500">ترتيب الفنّيين حسب حجم العمليات المنجزة</div>

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
                  <div className="flex flex-none items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">كفاءة {r.eff}%</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">{r.active} نشطة</span>
                    <span className="font-mono text-sm font-bold tabular-nums text-slate-900" dir="ltr">{r.total}</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(3, Math.round((r.total / maxTotal) * 100))}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 * i }}
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
