/* ============================================================================
 * VOLD MOTOR — Center Types: Single Source of Truth
 * ----------------------------------------------------------------------------
 * The ONLY allowed center categories. Used by every dropdown, filter, table,
 * chart, registration form, and the per-type Inventory/Services scaffolding.
 * Do NOT define center categories anywhere else.
 * ========================================================================== */
(function (root) {
  var TYPES = [
    { id: 'oil',         ar: 'مراكز تغيير الزيت',   en: 'Oil Change Centers',     color: '#bf8700', keywords: ['تغيير زيت', 'زيت', 'اويل', 'oil', 'lube'] },
    { id: 'battery',     ar: 'مراكز البطاريات',     en: 'Battery Centers',        color: '#1f883d', keywords: ['بطار', 'بطاريات', 'battery'] },
    { id: 'wash',        ar: 'مغاسل السيارات',      en: 'Car Washes',             color: '#2563eb', keywords: ['غسيل', 'مغسلة', 'مغاسل', 'wash', 'detail'] },
    { id: 'electric',    ar: 'كهربائي',            en: 'Electrician',            color: '#8250df', keywords: ['كهرب', 'electric'] },
    { id: 'mechanic',    ar: 'ميكانيكي',           en: 'Mechanic',               color: '#cf222e', keywords: ['ميكانيك', 'صيانة', 'محرك', 'mechanic'] },
    { id: 'accessories', ar: 'مركز زينة سيارات',    en: 'Car Accessories Center', color: '#0969da', keywords: ['زينة', 'تزيين', 'تلميع', 'تظليل', 'حماية', 'اكسسوار', 'accessor'] },
    { id: 'other',       ar: 'أخرى',               en: 'Other',                  color: '#57606a', keywords: [] },
  ];

  var LABELS = TYPES.map(function (t) { return t.ar; });

  /* Classify a center from its stored `services` array (or a single value). */
  function classify(services) {
    var arr = Array.isArray(services) ? services : [services];
    var s = arr.map(function (x) { return String(x == null ? '' : x).toLowerCase(); }).join(' ');
    for (var i = 0; i < TYPES.length; i++) {
      var t = TYPES[i];
      if (t.id === 'other') continue;
      for (var k = 0; k < t.keywords.length; k++) {
        if (s.indexOf(t.keywords[k].toLowerCase()) !== -1) return t.ar;
      }
    }
    return 'أخرى';
  }

  function colorOf(ar) { var t = byAr(ar); return t ? t.color : '#57606a'; }
  function byAr(ar) { return TYPES.filter(function (t) { return t.ar === ar; })[0] || null; }
  function byId(id) { return TYPES.filter(function (t) { return t.id === id; })[0] || null; }

  /* Build <option> markup for any dropdown (optional leading "all" option). */
  function optionsHTML(allLabel) {
    var html = allLabel ? '<option value="all">' + allLabel + '</option>' : '';
    return html + TYPES.map(function (t) { return '<option value="' + t.ar + '">' + t.ar + '</option>'; }).join('');
  }

  /* Per-type inventory categories → strict context isolation by activity type. */
  var CAT_PALETTE = ['#2563eb', '#1d6fd6', '#16a06a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#57606a'];
  var CATS = {
    'مراكز تغيير الزيت': [ { key: 'oil', label: 'زيوت' }, { key: 'filter', label: 'فلاتر' }, { key: 'fluid', label: 'سوائل' } ],
    'مراكز البطاريات':   [ { key: 'battery', label: 'بطاريات' }, { key: 'terminal', label: 'أطراف ووصلات' }, { key: 'charger', label: 'شواحن وفحص' } ],
    'مغاسل السيارات':    [ { key: 'shampoo', label: 'شامبو ومنظفات' }, { key: 'polish', label: 'مواد تلميع' }, { key: 'towel', label: 'مناشف' }, { key: 'freshener', label: 'معطرات' } ],
    'كهربائي':           [ { key: 'fuse', label: 'فيوزات' }, { key: 'wire', label: 'أسلاك' }, { key: 'light', label: 'إضاءة' } ],
    'ميكانيكي':          [ { key: 'brake', label: 'فرامل' }, { key: 'fluid', label: 'زيوت وسوائل' }, { key: 'parts', label: 'قطع غيار' } ],
    'مركز زينة سيارات':  [ { key: 'tint', label: 'تظليل' }, { key: 'protection', label: 'حماية ونانو' }, { key: 'accessory', label: 'اكسسوارات' } ],
    'أخرى':              [ { key: 'general', label: 'عام' } ],
  };
  function categoriesFor(arOrServices) {
    var ar = CATS[arOrServices] ? arOrServices : classify(arOrServices);
    var list = CATS[ar] || CATS['أخرى'];
    return list.map(function (c, i) { return { key: c.key, label: c.label, color: CAT_PALETTE[i % CAT_PALETTE.length] }; });
  }
  /* Global key→label lookup across every type (used for the "All Branches" mixed view). */
  var ALL_CAT_LABELS = (function () {
    var m = {};
    Object.keys(CATS).forEach(function (t) { CATS[t].forEach(function (c) { m[c.key] = c.label; }); });
    return m;
  })();
  function catLabelOf(key) { return ALL_CAT_LABELS[key] || key || 'أخرى'; }

  /* Per-type default catalog → distinct Inventory & Services paths. */
  var CATALOG = {
    'مراكز تغيير الزيت': {
      services: [
        { name: 'تغيير زيت 10W-40', price: 160 },
        { name: 'تغيير زيت تخليقي 5W-30', price: 220 },
        { name: 'تغيير فلتر زيت', price: 45 },
        { name: 'فحص ومستوى السوائل', price: 30 },
      ],
      inventory: [
        { name: 'كرتون زيت 10W-40', qty: 40, unit: 'كرتون', cat: 'oil', price: 180 },
        { name: 'كرتون زيت 5W-30 تخليقي', qty: 28, unit: 'كرتون', cat: 'oil', price: 240 },
        { name: 'فلاتر زيت', qty: 120, unit: 'قطعة', cat: 'filter', price: 25 },
        { name: 'فلاتر هواء', qty: 60, unit: 'قطعة', cat: 'filter', price: 40 },
        { name: 'سائل فرامل DOT4', qty: 35, unit: 'علبة', cat: 'fluid', price: 20 },
        { name: 'سائل تبريد رديتر', qty: 30, unit: 'جالون', cat: 'fluid', price: 18 },
      ],
    },
    'مراكز البطاريات': {
      services: [
        { name: 'تغيير بطارية', price: 280 },
        { name: 'فحص شحن البطارية', price: 25 },
        { name: 'صيانة أقطاب البطارية', price: 40 },
      ],
      inventory: [
        { name: 'بطاريات 70 أمبير', qty: 35, unit: 'قطعة', cat: 'battery', price: 280 },
        { name: 'بطاريات 90 أمبير', qty: 22, unit: 'قطعة', cat: 'battery', price: 360 },
        { name: 'أطراف ووصلات', qty: 80, unit: 'قطعة', cat: 'terminal', price: 15 },
        { name: 'شاحن بطارية', qty: 8, unit: 'جهاز', cat: 'charger', price: 220 },
      ],
    },
    'مغاسل السيارات': {
      services: [
        { name: 'غسيل VIP', price: 90 },
        { name: 'تنظيف داخلي (ديتيلنق)', price: 150 },
        { name: 'غسيل خارجي سريع', price: 35 },
        { name: 'تلميع وتشميع', price: 120 },
      ],
      inventory: [
        { name: 'جالون شامبو', qty: 25, unit: 'جالون', cat: 'shampoo', price: 45 },
        { name: 'مواد تلميع', qty: 30, unit: 'علبة', cat: 'polish', price: 35 },
        { name: 'مناشف مايكروفايبر', qty: 200, unit: 'قطعة', cat: 'towel', price: 8 },
        { name: 'معطرات', qty: 150, unit: 'قطعة', cat: 'freshener', price: 10 },
      ],
    },
    'كهربائي': {
      services: [
        { name: 'فحص كهرباء شامل', price: 120 },
        { name: 'إصلاح تمديدات', price: 200 },
        { name: 'برمجة ريموت', price: 90 },
      ],
      inventory: [
        { name: 'فيوزات', qty: 300, unit: 'قطعة', cat: 'fuse', price: 2 },
        { name: 'أسلاك', qty: 50, unit: 'لفة', cat: 'wire', price: 25 },
        { name: 'لمبات LED', qty: 150, unit: 'قطعة', cat: 'light', price: 18 },
      ],
    },
    'ميكانيكي': {
      services: [
        { name: 'تغيير تيل فرامل', price: 260 },
        { name: 'صيانة دورية', price: 350 },
        { name: 'فحص بالكمبيوتر', price: 120 },
      ],
      inventory: [
        { name: 'تيل فرامل', qty: 60, unit: 'طقم', cat: 'brake', price: 90 },
        { name: 'زيوت ناقل حركة', qty: 40, unit: 'علبة', cat: 'fluid', price: 40 },
        { name: 'قطع غيار متنوعة', qty: 120, unit: 'قطعة', cat: 'parts', price: 60 },
      ],
    },
    'مركز زينة سيارات': {
      services: [
        { name: 'تظليل حراري', price: 600 },
        { name: 'تلميع وحماية (نانو)', price: 350 },
        { name: 'تركيب اكسسوارات', price: 200 },
      ],
      inventory: [
        { name: 'رولات تظليل', qty: 30, unit: 'رول', cat: 'tint', price: 250 },
        { name: 'مواد حماية نانو', qty: 25, unit: 'علبة', cat: 'protection', price: 300 },
        { name: 'اكسسوارات داخلية', qty: 90, unit: 'قطعة', cat: 'accessory', price: 45 },
      ],
    },
    'أخرى': {
      services: [{ name: 'خدمة عامة', price: 100 }],
      inventory: [{ name: 'مستلزمات عامة', qty: 50, unit: 'قطعة', cat: 'general', price: 30 }],
    },
  };

  function catalogFor(arOrServices) {
    var ar = CATALOG[arOrServices] ? arOrServices : classify(arOrServices);
    return CATALOG[ar] || CATALOG['أخرى'];
  }

  root.VM_CENTER_TYPES = TYPES;
  root.VM_TYPE_LABELS = LABELS;
  root.VM_TYPE_CATALOG = CATALOG;
  root.vmClassify = classify;
  root.vmTypeColor = colorOf;
  root.vmTypeOptions = optionsHTML;
  root.vmTypeCatalog = catalogFor;
  root.vmTypeCategories = categoriesFor;
  root.vmCatLabel = catLabelOf;
  root.vmTypeById = byId;

  if (typeof module !== 'undefined' && module.exports) module.exports = root;
})(typeof window !== 'undefined' ? window : globalThis);
