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

// Default seed catalog per type — «تجهيز مخزون النشاط»: a ready-to-run starter
// inventory for every activity type, seeded on demand from the Inventory page.
// Fully editable afterwards (names / quantities / prices), and because it lives
// in the real `inventory` table it flows straight into future worker operations.
export const CATALOG = {
  'مراكز تغيير الزيت': [
    { name: 'كرتون زيت 10W-40', cat: 'oil', qty: 40, price: 180, unit: 'كرتون' },
    { name: 'كرتون زيت 5W-30 تخليقي', cat: 'oil', qty: 28, price: 240, unit: 'كرتون' },
    { name: 'كرتون زيت 20W-50', cat: 'oil', qty: 24, price: 160, unit: 'كرتون' },
    { name: 'كرتون زيت 0W-20 تخليقي كامل', cat: 'oil', qty: 16, price: 320, unit: 'كرتون' },
    { name: 'فلاتر زيت', cat: 'filter', qty: 120, price: 25, unit: 'قطعة' },
    { name: 'فلاتر هواء', cat: 'filter', qty: 60, price: 40, unit: 'قطعة' },
    { name: 'فلاتر مكيف', cat: 'filter', qty: 50, price: 35, unit: 'قطعة' },
    { name: 'بواجي إشعال NGK', cat: 'spark', qty: 80, price: 18, unit: 'قطعة' },
    { name: 'سائل فرامل DOT4', cat: 'fluid', qty: 35, price: 20, unit: 'علبة' },
    { name: 'ماء رديتر أخضر', cat: 'fluid', qty: 40, price: 15, unit: 'جالون' },
  ],
  'مراكز البطاريات': [
    { name: 'بطارية 55 أمبير', cat: 'battery', qty: 20, price: 260, unit: 'قطعة' },
    { name: 'بطارية 70 أمبير', cat: 'battery', qty: 16, price: 340, unit: 'قطعة' },
    { name: 'بطارية 90 أمبير', cat: 'battery', qty: 10, price: 450, unit: 'قطعة' },
    { name: 'أطراف بطارية نحاس', cat: 'terminal', qty: 60, price: 12, unit: 'قطعة' },
    { name: 'وصلات إسعاف', cat: 'terminal', qty: 15, price: 45, unit: 'قطعة' },
    { name: 'جهاز فحص بطارية', cat: 'charger', qty: 4, price: 220, unit: 'جهاز' },
  ],
  'مغاسل السيارات': [
    { name: 'جالون شامبو', cat: 'shampoo', qty: 25, price: 45, unit: 'جالون' },
    { name: 'منظف داخلي (تنجيد)', cat: 'shampoo', qty: 18, price: 38, unit: 'جالون' },
    { name: 'مناشف مايكروفايبر', cat: 'towel', qty: 200, price: 8, unit: 'قطعة' },
    { name: 'مواد تلميع', cat: 'polish', qty: 30, price: 35, unit: 'علبة' },
    { name: 'واكس حماية', cat: 'polish', qty: 20, price: 55, unit: 'علبة' },
    { name: 'معطرات', cat: 'freshener', qty: 150, price: 10, unit: 'قطعة' },
  ],
  'كهربائي': [
    { name: 'طقم فيوزات متنوعة', cat: 'fuse', qty: 40, price: 15, unit: 'طقم' },
    { name: 'أسلاك توصيل (لفة)', cat: 'wire', qty: 25, price: 30, unit: 'لفة' },
    { name: 'لمبات LED أمامية', cat: 'light', qty: 50, price: 60, unit: 'قطعة' },
    { name: 'لمبات إشارة', cat: 'light', qty: 80, price: 12, unit: 'قطعة' },
  ],
  'ميكانيكي': [
    { name: 'تيل فرامل أمامي', cat: 'brake', qty: 40, price: 90, unit: 'طقم' },
    { name: 'تيل فرامل خلفي', cat: 'brake', qty: 32, price: 75, unit: 'طقم' },
    { name: 'زيت قير أوتوماتيك', cat: 'fluid', qty: 24, price: 45, unit: 'لتر' },
    { name: 'قطع غيار متنوعة', cat: 'parts', qty: 30, price: 120, unit: 'قطعة' },
  ],
  'مركز زينة سيارات': [
    { name: 'لفة تظليل حراري', cat: 'tint', qty: 12, price: 350, unit: 'لفة' },
    { name: 'مواد حماية نانو سيراميك', cat: 'protection', qty: 10, price: 480, unit: 'علبة' },
    { name: 'أفلام حماية PPF', cat: 'protection', qty: 8, price: 900, unit: 'لفة' },
    { name: 'اكسسوارات داخلية', cat: 'accessory', qty: 40, price: 35, unit: 'قطعة' },
  ],
  'أخرى': [
    { name: 'مستلزمات عامة', cat: 'general', qty: 20, price: 25, unit: 'قطعة' },
  ],
};

export function catalogFor(centerType) {
  return CATALOG[centerType] || [];
}
