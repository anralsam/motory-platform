// Mock service price book (orders carry no price column yet). Maps the POS service
// names + seeded service_type values to a SAR amount. Replace with a real services
// table later — the structure stays the same.
export const SERVICE_PRICE = {
  'تغيير زيت 10W-40': 160, 'تغيير زيت تخليقي 5W-30': 220, 'تغيير فلتر زيت': 45, 'فحص ومستوى السوائل': 30,
  'تغيير بطارية': 280, 'فحص شحن البطارية': 25, 'صيانة أقطاب البطارية': 40,
  'غسيل VIP': 90, 'تنظيف داخلي (ديتيلنق)': 150, 'غسيل خارجي سريع': 35, 'تلميع وتشميع': 120,
  'فحص كهرباء شامل': 120, 'إصلاح تمديدات': 200, 'برمجة ريموت': 90,
  'تغيير تيل فرامل': 260, 'صيانة دورية': 350, 'فحص بالكمبيوتر': 120,
  'تظليل حراري': 600, 'تلميع وحماية (نانو)': 350, 'تركيب اكسسوارات': 200,
  'خدمة عامة': 100,
  // seeded order service_type values
  'تغيير زيت': 150, 'غسيل وتلميع': 120, 'فحص بطارية': 40, 'تغيير فلتر': 45, 'كهرباء': 150, 'ميكانيكا': 200, 'تبديل إطارات': 80,
};

export const VAT_RATE = 0.15;        // KSA VAT
export const COMMISSION_RATE = 0.02; // VOLD MOTOR platform commission

export function priceOf(serviceType) {
  return SERVICE_PRICE[serviceType] != null ? SERVICE_PRICE[serviceType] : 150;
}

// net (pre-VAT) → VAT → total (VAT-inclusive).
// Uses the REAL stamped order.price when present; falls back to the mock book.
export function invoiceTotals(order) {
  const net = order && order.price != null ? Number(order.price) : priceOf(order?.service_type);
  const vat = Math.round(net * VAT_RATE * 100) / 100;
  const total = Math.round((net + vat) * 100) / 100;
  return { net, vat, total };
}

export function invoiceNo(order) {
  return 'INV-' + String(order?.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function fmtSar(n) {
  return Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
