/**
 * WhatsApp dispatch — enterprise Cloud API (primary) + wa.me deep links (fallback).
 *
 *  • sendAutomatedWhatsApp(): SERVER-ONLY. Sends an approved Meta template from the
 *    center's official number via the Graph API. Called from server actions; never
 *    imported into a client component (so the token never reaches the bundle).
 *  • waPhone()/waUrl(): pure, client-safe helpers for the graceful manual fallback.
 */

// Approved Meta template registry: trigger → template name + ordered body variables.
const WA_TEMPLATES = {
  job_start: { name: 'vold_job_start', vars: (d) => [d.customer_name, d.vehicle_plate] },
  job_ready: { name: 'vold_job_ready', vars: (d) => [d.customer_name, d.short_receipt_url] },
};

/**
 * Fire an automated, approved-template WhatsApp message via the official Cloud API.
 * Returns { ok, fallback, reason } — fallback:true tells the caller to degrade to the
 * manual wa.me button. Never throws; bounded by a hard 4s timeout so it can't block.
 */
export async function sendAutomatedWhatsApp(phone, triggerType, data = {}) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: false, fallback: true, reason: 'cloud_api_unconfigured' };

  const to = waPhone(phone);
  if (!to) return { ok: false, fallback: true, reason: 'no_phone' };

  const tpl = WA_TEMPLATES[triggerType];
  if (!tpl) return { ok: false, fallback: true, reason: 'no_template' };

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: tpl.name,
      language: { code: 'ar' },
      components: [{ type: 'body', parameters: tpl.vars(data).map((v) => ({ type: 'text', text: String(v ?? '') })) }],
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, fallback: true, reason: `http_${res.status}` };
    return { ok: true, fallback: false };
  } catch (e) {
    return { ok: false, fallback: true, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

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
