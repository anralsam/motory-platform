'use client';

/**
 * Controlled premium toast. Parent owns `{ show, msg, type }` state.
 * type: 'success' | 'error' | 'info'
 */
export default function Toast({ toast }) {
  const { show, msg, type = 'success' } = toast || {};
  const tone =
    type === 'error'
      ? 'bg-red-600'
      : type === 'info'
      ? 'bg-gray-900'
      : 'bg-emerald-600';

  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      aria-live="polite"
    >
      <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${tone}`}>
        {type === 'error' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        )}
        <span>{msg}</span>
      </div>
    </div>
  );
}
