'use client';
/* شبكة أمان الأخطاء — بدل «Application error» الإنجليزية الجافة:
   شاشة عربية لطيفة بزر إعادة محاولة، مع تسجيل الخطأ للمطور في الكونسول. */
export default function ErrorBoundary({ error, reset }) {
  if (typeof console !== 'undefined') console.error('VM error boundary:', error);
  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f8fafc', fontFamily: 'Tajawal, system-ui, sans-serif', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{ fontSize: 44 }}>⚙️</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 12 }}>حدث خلل مؤقت</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.8 }}>
          واجهنا مشكلة غير متوقعة في تحميل هذه الصفحة. جرّب إعادة التحميل — وإن تكررت، سجّل خروجك وادخل من جديد.
        </p>
        <button onClick={() => reset()} style={{ marginTop: 18, background: '#0f172a', color: '#fff', border: 0, borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          إعادة المحاولة
        </button>
        <div style={{ marginTop: 10 }}>
          <a href="/" style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>← العودة للرئيسية</a>
        </div>
      </div>
    </div>
  );
}
