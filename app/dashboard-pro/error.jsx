'use client';
/* حدود خطأ مخصصة للإدارة العليا — تعرض سبب العطل حرفياً لتشخيص فوري. */
export default function DashboardProError({ error, reset }) {
  if (typeof console !== 'undefined') console.error('VM dashboard-pro error:', error);
  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', fontFamily: 'Tajawal, system-ui, sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 44 }}>🛠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 12 }}>
          خلل في لوحة الإدارة <span style={{ fontSize: 10, color: '#cbd5e1' }}>v39</span>
        </h1>
        <div dir="ltr" style={{ marginTop: 14, fontSize: 11, color: '#475569', wordBreak: 'break-all', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', textAlign: 'left', fontFamily: 'monospace' }}>
          {String(error?.message || 'unknown').slice(0, 300)}
          {error?.digest ? `\ndigest: ${error.digest}` : ''}
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>صوّر هذا المربع الرمادي وأرسله — يكشف السبب مباشرة</p>
        <button onClick={() => reset()} style={{ marginTop: 14, background: '#0f172a', color: '#fff', border: 0, borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
