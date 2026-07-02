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
  'أخرى': [{ key: 'general', label: 'مستلزمات تشغيلية' }],
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
  'مراكز تغيير الزيت': ['تغيير زيت 20W-50', 'تغيير زيت 10W-40 نصف تخليقي', 'تغيير زيت 5W-30 تخليقي', 'تغيير زيت 0W-20 تخليقي كامل', 'تغيير فلتر زيت', 'تغيير فلتر هواء', 'تغيير فلتر مكيف', 'تغيير بواجي', 'فحص ومستوى السوائل'],
  'مراكز البطاريات': ['تغيير بطارية', 'فحص شحن البطارية', 'صيانة أقطاب البطارية', 'شحن بطارية فارغة', 'خدمة إسعاف بطارية (متنقلة)'],
  'مغاسل السيارات': ['غسيل خارجي', 'غسيل داخلي', 'غسيل شامل (داخلي + خارجي)', 'غسيل VIP', 'تنظيف داخلي عميق (ديتيلنق)', 'غسيل بالبخار', 'تلميع وتشميع', 'تنظيف محرك', 'تلميع جنوط'],
  'كهربائي': ['فحص كهرباء شامل', 'إصلاح تمديدات', 'برمجة ريموت', 'تغيير لمبات وإضاءة'],
  'ميكانيكي': ['تغيير تيل فرامل', 'خرط هوبات', 'صيانة دورية', 'فحص بالكمبيوتر', 'تغيير زيت القير'],
  'مركز زينة سيارات': ['تظليل حراري', 'تلميع وحماية (نانو سيراميك)', 'أفلام حماية PPF', 'تركيب اكسسوارات'],
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
    // أشهر الزيوت المتداولة في السوق السعودي — أمثلة مؤسسة قابلة للتعديل والتسعير
    { name: 'موبيل سوبر 3000 — 5W-30 تخليقي', cat: 'oil', qty: 30, price: 95, unit: 'جالون 4L' },
    { name: 'موبيل 1 — 0W-20 تخليقي كامل', cat: 'oil', qty: 20, price: 165, unit: 'جالون 4L' },
    { name: 'كاسترول GTX — 20W-50', cat: 'oil', qty: 36, price: 65, unit: 'جالون 4L' },
    { name: 'كاسترول ماجناتيك — 5W-40', cat: 'oil', qty: 24, price: 120, unit: 'جالون 4L' },
    { name: 'شل هيلكس ألترا — 5W-40 تخليقي', cat: 'oil', qty: 24, price: 130, unit: 'جالون 4L' },
    { name: 'شل هيلكس HX5 — 20W-50', cat: 'oil', qty: 30, price: 55, unit: 'جالون 4L' },
    { name: 'بترومين سوبر — 20W-50', cat: 'oil', qty: 40, price: 45, unit: 'جالون 4L' },
    { name: 'تويوتا الأصلي — 0W-20', cat: 'oil', qty: 24, price: 110, unit: 'جالون 4L' },
    { name: 'فالفولين — 10W-40 نصف تخليقي', cat: 'oil', qty: 20, price: 75, unit: 'جالون 4L' },
    { name: 'فلتر زيت تويوتا أصلي', cat: 'filter', qty: 80, price: 28, unit: 'قطعة' },
    { name: 'فلتر زيت دنسو', cat: 'filter', qty: 60, price: 22, unit: 'قطعة' },
    { name: 'فلتر هواء', cat: 'filter', qty: 50, price: 40, unit: 'قطعة' },
    { name: 'فلتر مكيف كربوني', cat: 'filter', qty: 40, price: 35, unit: 'قطعة' },
    { name: 'بواجي NGK إيريديوم', cat: 'spark', qty: 64, price: 32, unit: 'قطعة' },
    { name: 'بواجي دنسو بلاتينيوم', cat: 'spark', qty: 48, price: 26, unit: 'قطعة' },
    { name: 'سائل فرامل DOT4', cat: 'fluid', qty: 30, price: 20, unit: 'علبة' },
    { name: 'ماء رديتر أحمر (تويوتا)', cat: 'fluid', qty: 30, price: 25, unit: 'جالون' },
    { name: 'ماء رديتر أخضر', cat: 'fluid', qty: 30, price: 15, unit: 'جالون' },
    { name: 'زيت قير أوتوماتيك ATF', cat: 'fluid', qty: 24, price: 45, unit: 'لتر' },
  ],
  'مراكز البطاريات': [
    { name: 'بطارية AC Delco — 55 أمبير', cat: 'battery', qty: 16, price: 280, unit: 'قطعة' },
    { name: 'بطارية AC Delco — 70 أمبير', cat: 'battery', qty: 12, price: 360, unit: 'قطعة' },
    { name: 'بطارية هانكوك — 55 أمبير', cat: 'battery', qty: 16, price: 230, unit: 'قطعة' },
    { name: 'بطارية هانكوك — 90 أمبير', cat: 'battery', qty: 8, price: 420, unit: 'قطعة' },
    { name: 'بطارية فارتا AGM — 70 أمبير', cat: 'battery', qty: 6, price: 560, unit: 'قطعة' },
    { name: 'أطراف بطارية نحاس', cat: 'terminal', qty: 60, price: 12, unit: 'قطعة' },
    { name: 'وصلات إسعاف 1000A', cat: 'terminal', qty: 12, price: 65, unit: 'قطعة' },
    { name: 'جهاز فحص وشحن بطاريات', cat: 'charger', qty: 3, price: 450, unit: 'جهاز' },
  ],
  'مغاسل السيارات': [
    { name: 'شامبو سيارات مركّز', cat: 'shampoo', qty: 25, price: 45, unit: 'جالون' },
    { name: 'منظف تنجيد ودواخل', cat: 'shampoo', qty: 18, price: 38, unit: 'جالون' },
    { name: 'منظف جنوط وإطارات', cat: 'shampoo', qty: 15, price: 42, unit: 'جالون' },
    { name: 'مناشف مايكروفايبر', cat: 'towel', qty: 200, price: 8, unit: 'قطعة' },
    { name: 'قفازات غسيل', cat: 'towel', qty: 40, price: 15, unit: 'قطعة' },
    { name: 'ملمع دركسون وتابلوه', cat: 'polish', qty: 30, price: 28, unit: 'علبة' },
    { name: 'واكس حماية كرنوبا', cat: 'polish', qty: 20, price: 55, unit: 'علبة' },
    { name: 'ملمع إطارات', cat: 'polish', qty: 25, price: 22, unit: 'علبة' },
    { name: 'معطر داخلي', cat: 'freshener', qty: 150, price: 10, unit: 'قطعة' },
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
    { name: 'هوبات فرامل', cat: 'brake', qty: 16, price: 180, unit: 'قطعة' },
    { name: 'زيت قير أوتوماتيك', cat: 'fluid', qty: 24, price: 45, unit: 'لتر' },
    { name: 'قطع غيار متنوعة', cat: 'parts', qty: 30, price: 120, unit: 'قطعة' },
  ],
  'مركز زينة سيارات': [
    { name: 'لفة تظليل حراري سيراميك', cat: 'tint', qty: 12, price: 350, unit: 'لفة' },
    { name: 'مواد حماية نانو سيراميك', cat: 'protection', qty: 10, price: 480, unit: 'علبة' },
    { name: 'أفلام حماية PPF', cat: 'protection', qty: 8, price: 900, unit: 'لفة' },
    { name: 'اكسسوارات داخلية', cat: 'accessory', qty: 40, price: 35, unit: 'قطعة' },
  ],
  'أخرى': [
    { name: 'قفازات عمل', cat: 'general', qty: 50, price: 8, unit: 'زوج' },
    { name: 'مناديل ورشة صناعية', cat: 'general', qty: 30, price: 18, unit: 'رول' },
    { name: 'منظف أيدي صناعي', cat: 'general', qty: 20, price: 22, unit: 'علبة' },
  ],
};

export function catalogFor(centerType) {
  return CATALOG[centerType] || [];
}
