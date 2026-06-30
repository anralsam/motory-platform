'use client';

/**
 * WorkerDashboard — technician's mobile-first task console (Native-iOS feel).
 * Full-screen, RTL, ultra-fast (optimistic, no loaders). Layout:
 *   • TopBar      — large name · Active/Break toggle · live shift timer.
 *   • TaskChips   — horizontal selector when more than one task is assigned.
 *   • CurrentTask — massive hero: plate (mono) · service · 3-stage progress +
 *                   3 fast-action buttons (انتظار / جاري العمل / انتهاء).
 *   • QuickDeduct — searchable parts row + Confirm (deducts from center stock).
 * framer-motion drives every state transition; whileTap gives tactile feedback.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass, Wrench, CheckCircle2, Search, Minus, Plus, Power, LogOut } from 'lucide-react';
import { updateOrderStatus, deductParts } from '@/app/dashboard-pro/actions';

const STAGES = [
  { key: 'pending', label: 'انتظار', Icon: Hourglass },
  { key: 'in_progress', label: 'جاري العمل', Icon: Wrench },
  { key: 'completed', label: 'انتهاء', Icon: CheckCircle2 },
];
const stageIndex = (s) => (s === 'completed' ? 2 : s === 'pending' ? 0 : 1);
const fmtClock = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

export default function WorkerDashboard({ userName = 'الفنّي', orders = [], inventory = [] }) {
  const [tasks, setTasks] = useState(orders);
  const [inv, setInv] = useState(inventory);
  const [activeId, setActiveId] = useState(orders[0]?.id || null);
  const [presence, setPresence] = useState('active');
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);

  // Live shift timer (runs only while "active").
  useEffect(() => {
    if (presence !== 'active') return undefined;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [presence]);

  const active = tasks.find((o) => o.id === activeId) || tasks[0] || null;
  const curStage = active ? stageIndex(active.status) : 0;

  async function setStage(status) {
    if (!active || busy) return;
    setBusy(true);
    const prev = tasks;
    setTasks((t) => t.map((o) => (o.id === active.id ? { ...o, status } : o)));
    const r = await updateOrderStatus(active.id, status);
    if (!r?.ok) setTasks(prev);
    setBusy(false);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 pb-10 font-sans text-slate-900">
      <div className="mx-auto max-w-xl space-y-5 px-4 pt-5">
        <TopBar name={userName} presence={presence} onToggle={() => setPresence((p) => (p === 'active' ? 'break' : 'active'))} clock={fmtClock(secs)} />

        {tasks.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {tasks.map((o) => (
              <button key={o.id} onClick={() => setActiveId(o.id)}
                className={`shrink-0 rounded-full px-4 py-2 font-mono text-sm font-bold tracking-widest transition-all duration-200 ${o.id === active?.id ? 'bg-[#2563eb] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`} dir="ltr">
                {o.plate || '—'}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={active.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
              <CurrentTask order={active} stage={curStage} onStage={setStage} busy={busy} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={40} />
              <div className="text-lg font-bold">لا توجد مهام الآن</div>
              <div className="mt-1 text-sm text-slate-400">استمتع باستراحتك ☕️</div>
            </motion.div>
          )}
        </AnimatePresence>

        {active && <QuickDeduct orderId={active.id} inv={inv} setInv={setInv} />}
      </div>
    </div>
  );
}

function TopBar({ name, presence, onToggle, clock }) {
  const on = presence === 'active';
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="text-2xl font-extrabold tracking-tight">{name}</div>
        <div className="mt-1 font-mono text-sm font-semibold text-slate-500" dir="ltr">{clock}</div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <motion.button whileTap={{ scale: 1.05 }} onClick={onToggle}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          <Power size={15} strokeWidth={2.5} />{on ? 'نشط' : 'استراحة'}
        </motion.button>
        <a href="/" className="flex items-center gap-1 text-xs font-medium text-slate-300 transition-colors hover:text-slate-500"><LogOut size={12} /> خروج</a>
      </div>
    </div>
  );
}

function CurrentTask({ order, stage, onStage, busy }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Hero: plate + service */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-7 text-white">
        <div className="text-xs font-medium text-white/50">المركبة الحالية</div>
        <div className="mt-2 font-mono text-5xl font-black tracking-[0.15em]" dir="ltr">{order.plate || '—'}</div>
        <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
          <span className="rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-white">{order.service_type || 'خدمة'}</span>
          <span>{[order.car_make, order.car_model].filter(Boolean).join(' ') || order.customer_name || 'عميل'}</span>
        </div>
      </div>

      {/* 3-stage progress */}
      <div className="px-7 pt-6">
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center last:flex-none">
              <motion.div animate={{ backgroundColor: i <= stage ? '#2563eb' : '#e2e8f0', color: i <= stage ? '#fff' : '#94a3b8' }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full">
                <s.Icon size={16} strokeWidth={2.5} />
              </motion.div>
              {i < STAGES.length - 1 && (
                <div className="mx-1 h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <motion.div animate={{ width: i < stage ? '100%' : '0%' }} transition={{ duration: 0.4, ease: 'easeOut' }} className="h-full rounded-full bg-[#2563eb]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fast actions */}
      <div className="grid grid-cols-3 gap-3 p-5">
        {STAGES.map((s, i) => {
          const activeStage = i === stage;
          return (
            <motion.button key={s.key} whileTap={{ scale: 1.05 }} disabled={busy} onClick={() => onStage(s.key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl py-4 text-sm font-bold transition-colors duration-300 disabled:opacity-60 ${activeStage ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-600/25' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
              <s.Icon size={22} strokeWidth={2.2} />
              {s.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function QuickDeduct({ orderId, inv, setInv }) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q || sel) return [];
    return inv.filter((i) => (i.name || '').includes(q)).slice(0, 5);
  }, [query, inv, sel]);

  async function confirm() {
    if (!sel || qty < 1 || busy) return;
    setBusy(true);
    const prev = inv;
    setInv((v) => v.map((i) => (i.id === sel.id ? { ...i, quantity: Math.max(0, (i.quantity || 0) - qty) } : i)));
    const name = sel.name;
    setSel(null); setQuery(''); setQty(1);
    const r = await deductParts(orderId, [{ itemId: prev.find((i) => i.name === name)?.id, qty }]);
    if (!r?.ok) { setInv(prev); setFlash({ ok: false, msg: r?.error || 'تعذّر الصرف' }); }
    else setFlash({ ok: true, msg: `تم صرف ${qty} × ${name}` });
    setBusy(false);
    setTimeout(() => setFlash(null), 2500);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 text-sm font-bold">صرف سريع من المخزون</div>

      {sel ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{sel.name}</div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-1">
            <motion.button whileTap={{ scale: 1.1 }} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-600"><Minus size={15} /></motion.button>
            <span className="w-7 text-center font-inter font-bold tabular-nums" dir="ltr">{qty}</span>
            <motion.button whileTap={{ scale: 1.1 }} onClick={() => setQty((q) => q + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-600"><Plus size={15} /></motion.button>
          </div>
          <motion.button whileTap={{ scale: 1.05 }} disabled={busy} onClick={confirm}
            className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60">تأكيد</motion.button>
          <button onClick={() => { setSel(null); setQuery(''); }} className="px-1 text-xs text-slate-400">إلغاء</button>
        </div>
      ) : (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قطعة غيار…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pe-4 ps-10 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white" />
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.map((i) => (
                  <button key={i.id} onClick={() => { setSel(i); setQuery(i.name); }}
                    className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-slate-50">
                    <span className="font-medium text-slate-700">{i.name}</span>
                    <span className="text-xs text-slate-400">متوفّر: <span className="font-inter font-semibold tabular-nums text-slate-600" dir="ltr">{i.quantity ?? 0}</span> {i.unit || ''}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mt-3 rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${flash.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {flash.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
