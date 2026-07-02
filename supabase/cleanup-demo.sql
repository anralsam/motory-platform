-- ═══════════════════════════════════════════════════════════════════════════
-- VOLD MOTOR — تنظيف بيانات العرض التجريبي (Demo Cleanup)
-- يحذف حصرياً الصفوف الموسومة التي زرعها seed-demo.sql — لا يمس أي بيانات حقيقية:
--   • العمليات: اللوحات التي تبدأ بـ 'DMO'
--   • العملاء: لوحاتهم تبدأ بـ 'DMO' وجوالاتهم على النمط التجريبي 96655500xx
--   • المخزون: المورّد = 'DEMO'
--   • الفروع: الاسم ينتهي بـ «(تجريبي)»
-- استبدل المعرّف ثم شغّل في Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  mid uuid := 'REPLACE_WITH_MERCHANT_UUID';  -- ← نفس معرّف المالك المستخدم في الزرع
BEGIN
  DELETE FROM inventory_movements WHERE merchant_id = mid
    AND item_id IN (SELECT id FROM inventory WHERE merchant_id = mid AND supplier = 'DEMO');
  DELETE FROM orders    WHERE merchant_id = mid AND plate LIKE 'DMO%';
  DELETE FROM customers WHERE merchant_id = mid AND car_plate LIKE 'DMO%' AND phone LIKE '96655500%';
  DELETE FROM inventory WHERE merchant_id = mid AND supplier = 'DEMO';
  DELETE FROM branches  WHERE owner_id   = mid AND name LIKE '%(تجريبي)';
  RAISE NOTICE 'تم حذف كل بيانات العرض التجريبي ✔';
END $$;
