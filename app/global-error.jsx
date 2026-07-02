'use client';
/* حارس الأعطال الجذرية (يستبدل شاشة Application error بالكامل). */
export default function GlobalError({ error, reset }) {
  if (typeof console !== 'undefined') console.error('VM global error:', error);
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 44 }}>🔧</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 12 }}>عذراً — خلل مؤقت في المنصة</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.8 }}>فريقنا يتلقى هذه الأعطال تلقائياً. أعد التحميل وستعود الأمور لطبيعتها.</p>
          <button onClick={() => reset()} style={{ marginTop: 18, background: '#0f172a', color: '#fff', border: 0, borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            إعادة تحميل
          </button>
        </div>
      </body>
    </html>
  );
}
