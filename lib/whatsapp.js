/**
 * WhatsApp dispatch helpers — shared by the automation hub + worker shop-floor CTA.
 * Pure functions (no React) so they're usable on client and server.
 */

// Normalize a Saudi/intl phone into the digits-only form wa.me expects.
export function waPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 9 && d.startsWith('5')) d = `966${d}`; // local KSA mobile
  return d;
}

export function waUrl(phone, text) {
  const d = waPhone(phone);
  if (!d) return '';
  return `https://wa.me/${d}?text=${encodeURIComponent(text || '')}`;
}

// The five automation triggers (single source of truth for the hub + dispatch).
export const AUTOMATIONS = [
  { key: 'welcome', label: 'رسالة الترحيب والتحقق', hint: 'تُرسل عند انضمام العميل / إنشاء الحساب.' },
  { key: 'job_start', label: 'إشعار بدء الصيانة', hint: 'يُرسل عند تحويل المركبة إلى «جاري العمل».', msg: 'جاري صيانة مركبتك الآن ⚙️' },
  { key: 'job_ready', label: 'إشعار جاهزية المركبة', hint: 'يُرسل عند تحويل المركبة إلى «جاهز للاستلام».', msg: 'انتهت الصيانة ومركبتك جاهزة للاستلام ✅' },
  { key: 'invoice', label: 'الفواتير الضريبية والرقمية', hint: 'تُرسل مع رابط مختصر آمن للفاتورة.' },
  { key: 'campaigns', label: 'حملات الكوبونات والعروض الموسمية', hint: 'رسائل تسويقية للعروض والكوبونات.' },
];

// Defaults when a merchant has no saved row yet.
export const AUTOMATION_DEFAULTS = { welcome: true, job_start: true, job_ready: true, invoice: true, campaigns: false };
