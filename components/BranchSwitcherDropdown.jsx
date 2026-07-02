'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useBranchStore } from '@/store/branchStore';

/**
 * Global Branch Switcher — premium glass-header control. Reads & writes the shared
 * zustand branch store (the cross-tree brain), so the header here and the DNA data
 * context stay perfectly in sync. Selecting a branch / "كل الفروع" flips the store;
 * the dashboard re-slices client-side instantly (no refetch, no loader).
 */
export default function BranchSwitcherDropdown() {
  const branches = useBranchStore((s) => s.branches);
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);
  const loadBranches = useBranchStore((s) => s.loadBranches);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const { t } = useT();
  const current = selectedId === 'all'
    ? { id: 'all', name: t('كل الفروع') }
    : branches.find((b) => b.id === selectedId) || { id: 'all', name: t('كل الفروع') };

  const options = [{ id: 'all', name: t('كل الفروع'), all: true }, ...branches];

  return (
    <div className="relative inline-block text-right" dir="rtl" ref={ref}>
      {/* Trigger */}
      <button onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/40 bg-slate-100/80 px-4 py-2 text-sm font-bold text-slate-800 transition-all hover:bg-slate-200/80">
        <Building2 size={15} className="text-blue-600" />
        <span className="max-w-[160px] truncate">{current.name}</span>
        <ChevronDown size={15} className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {options.map((b) => {
              const on = selectedId === b.id;
              return (
                <button key={b.id} onClick={() => { setSelectedBranch(b.id); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${on ? 'bg-blue-50 font-bold text-blue-600' : 'font-medium text-slate-700 hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-2 truncate">
                    {b.all ? <Building2 size={14} /> : <span className={`h-1.5 w-1.5 rounded-full ${b.is_primary ? 'bg-blue-600' : 'bg-slate-300'}`} />}
                    <span className="truncate">{b.name}{b.is_primary ? t(' · رئيسي', ' · Primary') : ''}</span>
                  </span>
                  {on && <Check size={15} strokeWidth={3} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
