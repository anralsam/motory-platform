'use client';

/**
 * FilterSelect — YouTube-Studio-style dropdown filter (shared DNA).
 * Replaces the old always-visible pill matrices: a compact button showing the
 * current selection, opening a floating menu with a check on the active option.
 * Closes on outside click / Escape. Used by UnifiedChart + AnalyticsPanel across
 * all three consoles (admin / merchant / worker) so the DM stays unified.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function FilterSelect({ label, options = [], value, onChange, align = 'start' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = options.find((o) => o.key === value);

  return (
    <div ref={ref} className="relative inline-block" dir="rtl">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${open ? 'border-blue-400 bg-blue-50/60 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
        {label ? <span className="text-xs font-medium text-slate-400">{label}</span> : null}
        <span className="whitespace-nowrap">{current?.label || '—'}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="listbox"
          className={`absolute top-full z-40 mt-1.5 min-w-[10.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ${align === 'end' ? 'start-0' : 'end-0'}`}>
          {options.map((o) => {
            const on = o.key === value;
            return (
              <button key={o.key} role="option" aria-selected={on}
                onClick={() => { onChange?.(o.key); setOpen(false); }}
                className={`flex w-full items-center justify-between gap-6 px-4 py-2.5 text-start text-sm transition-colors ${on ? 'bg-blue-50/70 font-bold text-blue-700' : 'font-medium text-slate-700 hover:bg-slate-50'}`}>
                <span className="whitespace-nowrap">{o.label}</span>
                {on ? <Check size={15} className="flex-none" /> : <span className="w-[15px]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
