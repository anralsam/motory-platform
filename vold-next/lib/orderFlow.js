// Strict 4-state operational flow for the technician board. No financial data.
export const FLOW = ['pending', 'in_progress', 'ready', 'completed'];

export const META = {
  pending:     { ar: 'قيد الانتظار',   col: 'amber',   next: 'in_progress', action: 'بدء العمل',    actionColor: 'green' },
  in_progress: { ar: 'جاري العمل',      col: 'blue',    next: 'ready',       action: 'إنهاء العمل',  actionColor: 'blue' },
  ready:       { ar: 'جاهزة للاستلام',  col: 'slate',   next: 'completed',   action: 'تسليم للعميل', actionColor: 'gray' },
  completed:   { ar: 'تم التسليم',       col: 'emerald', next: null,          action: null,           actionColor: null },
};

// Timestamp column to stamp when transitioning INTO a status.
export const STAMP_FOR = {
  in_progress: 'started_at',
  ready: 'ready_at',
  completed: 'completed_at',
};

export const LATE_MIN = 45;

export function elapsedMins(order) {
  const base = order.started_at || order.created_at;
  if (!base) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(base).getTime()) / 60000));
}

export function elapsedLabel(mins) {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} د`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} س ${m} د` : `${h} س`;
}

// Tailwind tints for column headers / status chips.
export const COL_TINT = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/15',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
};

// Big action-button colors (mobile "dirty hands" UI).
export const ACTION_BTN = {
  green: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
  blue: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  gray: 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800',
};
