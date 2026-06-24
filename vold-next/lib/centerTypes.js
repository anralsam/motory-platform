// Context-aware inventory categories, keyed by the branch's center_type (Arabic label).
// Ported from the vanilla center-types.js so both stacks share the same taxonomy.
const CAT_PALETTE = ['#2563eb', '#1d6fd6', '#16a06a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#57606a'];

export const CATS = {
  'مراكز تغيير الزيت': [
    { key: 'oil', label: 'زيوت' },
    { key: 'filter', label: 'فلاتر' },
    { key: 'spark', label: 'بواجي' },
    { key: 'fluid', label: 'سوائل' },
  ],
  'مراكز البطاريات': [
    { key: 'battery', label: 'بطاريات' },
    { key: 'terminal', label: 'أطراف ووصلات' },
    { key: 'charger', label: 'شواحن وفحص' },
  ],
  'مغاسل السيارات': [
    { key: 'shampoo', label: 'شامبو ومنظفات' },
    { key: 'towel', label: 'مناشف مايكروفايبر' },
    { key: 'polish', label: 'مواد تلميع' },
    { key: 'freshener', label: 'معطرات' },
  ],
  'كهربائي': [
    { key: 'fuse', label: 'فيوزات' },
    { key: 'wire', label: 'أسلاك' },
    { key: 'light', label: 'إضاءة' },
  ],
  'ميكانيكي': [
    { key: 'brake', label: 'فرامل' },
    { key: 'fluid', label: 'زيوت وسوائل' },
    { key: 'parts', label: 'قطع غيار' },
  ],
  'مركز زينة سيارات': [
    { key: 'tint', label: 'تظليل' },
    { key: 'protection', label: 'حماية ونانو' },
    { key: 'accessory', label: 'اكسسوارات' },
  ],
  'أخرى': [{ key: 'general', label: 'عام' }],
};

const DEFAULT_TYPE = 'أخرى';

export function categoriesFor(centerType) {
  const list = CATS[centerType] || CATS[DEFAULT_TYPE];
  return list.map((c, i) => ({ key: c.key, label: c.label, color: CAT_PALETTE[i % CAT_PALETTE.length] }));
}

const ALL_LABELS = (() => {
  const m = {};
  Object.values(CATS).forEach((list) => list.forEach((c) => { m[c.key] = c.label; }));
  return m;
})();

export function catLabelOf(key) {
  return ALL_LABELS[key] || key || 'أخرى';
}

// Context-aware service menu per center type (names only — orders carry no prices).
export const SERVICES = {
  'مراكز تغيير الزيت': ['تغيير زيت 10W-40', 'تغيير زيت تخليقي 5W-30', 'تغيير فلتر زيت', 'فحص ومستوى السوائل'],
  'مراكز البطاريات': ['تغيير بطارية', 'فحص شحن البطارية', 'صيانة أقطاب البطارية'],
  'مغاسل السيارات': ['غسيل VIP', 'تنظيف داخلي (ديتيلنق)', 'غسيل خارجي سريع', 'تلميع وتشميع'],
  'كهربائي': ['فحص كهرباء شامل', 'إصلاح تمديدات', 'برمجة ريموت'],
  'ميكانيكي': ['تغيير تيل فرامل', 'صيانة دورية', 'فحص بالكمبيوتر'],
  'مركز زينة سيارات': ['تظليل حراري', 'تلميع وحماية (نانو)', 'تركيب اكسسوارات'],
  'أخرى': ['خدمة عامة'],
};
export function servicesFor(centerType) {
  return SERVICES[centerType] || SERVICES['أخرى'];
}

// Default seed catalog per type (used by "load defaults" — optional).
export const CATALOG = {
  'مراكز تغيير الزيت': [
    { name: 'كرتون زيت 10W-40', cat: 'oil', qty: 40, price: 180, unit: 'كرتون' },
    { name: 'كرتون زيت 5W-30 تخليقي', cat: 'oil', qty: 28, price: 240, unit: 'كرتون' },
    { name: 'فلاتر زيت', cat: 'filter', qty: 120, price: 25, unit: 'قطعة' },
    { name: 'فلاتر هواء', cat: 'filter', qty: 60, price: 40, unit: 'قطعة' },
    { name: 'بواجي إشعال NGK', cat: 'spark', qty: 80, price: 18, unit: 'قطعة' },
    { name: 'سائل فرامل DOT4', cat: 'fluid', qty: 35, price: 20, unit: 'علبة' },
  ],
  'مغاسل السيارات': [
    { name: 'جالون شامبو', cat: 'shampoo', qty: 25, price: 45, unit: 'جالون' },
    { name: 'مناشف مايكروفايبر', cat: 'towel', qty: 200, price: 8, unit: 'قطعة' },
    { name: 'مواد تلميع', cat: 'polish', qty: 30, price: 35, unit: 'علبة' },
    { name: 'معطرات', cat: 'freshener', qty: 150, price: 10, unit: 'قطعة' },
  ],
};

export function catalogFor(centerType) {
  return CATALOG[centerType] || [];
}
