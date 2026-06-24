'use client';
import { useEffect, useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';

export default function BranchSwitcherDropdown() {
  const branches = useBranchStore((s) => s.branches);
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);
  const loadBranches = useBranchStore((s) => s.loadBranches);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const current =
    selectedId === 'all'
      ? { id: 'all', name: 'كل الفروع', is_primary: false }
      : branches.find((b) => b.id === selectedId) || { id: 'all', name: 'كل الفروع' };

  // Hide the switcher entirely when there's only one branch (nothing to switch).
  if (branches.length < 2) {
    return (
      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
        <BranchIcon />
        <span>{branches[0]?.name || 'مركزي'}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-gray-800 transition hover:border-brand hover:bg-white"
      >
        <BranchIcon />
        <span className="max-w-[140px] truncate">{current.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`transition ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            onClick={() => { setSelectedBranch('all'); setOpen(false); }}
            className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-bold transition hover:bg-gray-50 ${selectedId === 'all' ? 'text-brand' : 'text-gray-700'}`}
          >
            🏢 كل الفروع
            {selectedId === 'all' && <Check />}
          </button>
          <div className="h-px bg-gray-100" />
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => { setSelectedBranch(b.id); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-bold transition hover:bg-gray-50 ${selectedId === b.id ? 'text-brand' : 'text-gray-700'}`}
            >
              <span className="flex items-center gap-2 truncate">
                {b.is_primary ? '⭐' : '•'} <span className="truncate">{b.name}</span>
              </span>
              {selectedId === b.id && <Check />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BranchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
