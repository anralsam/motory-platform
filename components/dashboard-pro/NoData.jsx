/**
 * "No Data Available" — minimalist YouTube-Studio-Light empty state.
 * Rendered instead of bare 0s when a fetch is empty or fails. Static (server-safe).
 */
export default function NoData({ title = 'لا توجد بيانات متاحة', hint = 'لم نتمكّن من جلب البيانات، أو لا توجد سجلات بعد.', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-slate-300 ring-1 ring-slate-200">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      </span>
      <div>
        <div className="text-sm font-bold text-slate-700">{title}</div>
        <div className="mt-1 text-xs text-slate-400">{hint}</div>
      </div>
    </div>
  );
}
