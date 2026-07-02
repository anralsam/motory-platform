-- ═══════════════════════════════════════════════════════════════════════════
-- VOLD MOTOR — بيانات العرض التجريبي (Demo Seed)
-- يزرع تحت حساب مالك واحد: 3 فروع، 24 عميلاً، ~150 عملية على 60 يوماً
-- (أغلبها مكتمل + عمليات «الآن» بالانتظار وتحت الخدمة لتعبئة المتابعة الحية)،
-- ومخزون مبدئي لكل فرع.
--
-- طريقة التشغيل (Supabase → SQL Editor):
--   1) استبدل القيمة في السطر التالي بمعرّف حساب المالك (auth user id):
--      يظهر في Supabase → Authentication → Users → انسخ الـ UUID.
--   2) شغّل السكربت كاملاً. للتراجع: شغّل cleanup-demo.sql.
--
-- كل الصفوف التجريبية موسومة: لوحات السيارات تبدأ بـ 'DMO'، أسماء الفروع
-- تنتهي بـ «(تجريبي)»، والمورّد في المخزون = 'DEMO' — فالتنظيف آمن ودقيق.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  mid uuid := 'REPLACE_WITH_MERCHANT_UUID';  -- ← ① ضع معرّف المالك هنا
  b1 uuid; b2 uuid; b3 uuid;
  bid uuid; cid uuid;
  branch_ids uuid[];
  names text[] := ARRAY['عبدالله السبيعي','محمد القحطاني','فهد العتيبي','سلطان الدوسري','خالد الشمري','ناصر الحربي','بندر المطيري','تركي الغامدي','سعود الزهراني','ماجد العنزي','عبدالعزيز البقمي','يوسف الشهراني','راكان السلمي','مشعل الرشيدي','نايف الجهني','وليد الخالدي','عمر باجابر','أنس الحازمي','صالح المالكي','حسام العمري','زياد الثبيتي','طلال الصاعدي','رائد الحمدان','باسل النفيعي'];
  makes text[] := ARRAY['تويوتا','هيونداي','نيسان','فورد','شفروليه','كيا','لكزس','جي إم سي'];
  models text[] := ARRAY['كامري','سوناتا','باترول','إكسبلورر','تاهو','سبورتاج','ES350','يوكن'];
  oil_services  text[] := ARRAY['تغيير زيت 5W-30 تخليقي','تغيير زيت 20W-50','تغيير فلتر زيت','تغيير فلتر هواء','تغيير بواجي','فحص ومستوى السوائل','تغيير زيت 0W-20 تخليقي كامل'];
  wash_services text[] := ARRAY['غسيل خارجي','غسيل داخلي','غسيل شامل (داخلي + خارجي)','غسيل VIP','غسيل بالبخار','تلميع وتشميع','تنظيف داخلي عميق (ديتيلنق)'];
  services text[]; -- تُحدَّد حسب اختصاص الفرع — كل فرع تخصص واحد فقط
  st text; svc text; created timestamptz; price numeric; i int; n int;
BEGIN
  -- ── ① ثلاثة فروع تجريبية ──
  INSERT INTO branches (owner_id, name, center_type, is_primary)
    VALUES (mid, 'فرع الرياض — العليا (تجريبي)', 'مراكز تغيير الزيت', false) RETURNING id INTO b1;
  INSERT INTO branches (owner_id, name, center_type, is_primary)
    VALUES (mid, 'فرع جدة — الحمراء (تجريبي)', 'مراكز تغيير الزيت', false) RETURNING id INTO b2;
  INSERT INTO branches (owner_id, name, center_type, is_primary)
    VALUES (mid, 'فرع الدمام — الشاطئ (تجريبي)', 'مغاسل السيارات', false) RETURNING id INTO b3;
  branch_ids := ARRAY[b1, b2, b3];

  -- ── ② مخزون مبدئي لكل فرع (موسوم DEMO) ──
  FOREACH bid IN ARRAY branch_ids LOOP
    INSERT INTO inventory (merchant_id, branch_id, name, category, quantity, min_quantity, unit, sell_price, supplier) VALUES
      (mid, bid, 'موبيل سوبر 3000 — 5W-30', 'oil',    18 + floor(random()*20)::int, 8,  'جالون 4L', 95,  'DEMO'),
      (mid, bid, 'كاسترول GTX — 20W-50',    'oil',    12 + floor(random()*20)::int, 8,  'جالون 4L', 65,  'DEMO'),
      (mid, bid, 'فلتر زيت تويوتا أصلي',    'filter', 30 + floor(random()*40)::int, 15, 'قطعة',     28,  'DEMO'),
      (mid, bid, 'بواجي NGK إيريديوم',      'spark',  3,                            10, 'قطعة',     32,  'DEMO'),  -- ناقص عمداً (لإشعار النواقص)
      (mid, bid, 'ماء رديتر أخضر',          'fluid',  20 + floor(random()*15)::int, 6,  'جالون',    15,  'DEMO');
  END LOOP;

  -- ── ③ 24 عميلاً تجريبياً ──
  FOR i IN 1..24 LOOP
    bid := branch_ids[1 + floor(random()*3)::int];
    INSERT INTO customers (merchant_id, branch_id, full_name, phone, car_make, car_model, car_plate, total_visits)
    VALUES (mid, bid, names[i], '96655500' || lpad(i::text, 2, '0'),
            makes[1 + floor(random()*8)::int], models[1 + floor(random()*8)::int],
            'DMO-' || (1000 + i)::text, 1 + floor(random()*9)::int);
  END LOOP;

  -- ── ④ ~150 عملية على آخر 60 يوماً (منحنى واقعي للرسم البياني) ──
  FOR i IN 1..150 LOOP
    bid := branch_ids[1 + floor(random()*3)::int];
    services := CASE WHEN bid = b3 THEN wash_services ELSE oil_services END;  -- تخصص الفرع
    n := 1 + floor(random()*24)::int;
    svc := services[1 + floor(random()*7)::int];
    price := (ARRAY[80,120,160,220,280,350,420,520])[1 + floor(random()*8)::int];
    created := now() - (random()*60 || ' days')::interval - (random()*10 || ' hours')::interval;
    st := 'completed';
    INSERT INTO orders (merchant_id, branch_id, customer_name, customer_phone, car_make, car_model, plate, service_type, status, price, created_at, started_at, completed_at)
    VALUES (mid, bid, names[n], '96655500' || lpad(n::text, 2, '0'),
            makes[1 + floor(random()*8)::int], models[1 + floor(random()*8)::int],
            'DMO-' || (1000 + n)::text, svc, st, price,
            created, created + interval '10 minutes', created + interval '55 minutes');
  END LOOP;

  -- ── ⑤ عمليات «الآن» — تعبّئ المتابعة الحية والوقت الفعلي ──
  --     لكل فرع: 2-4 بالانتظار، 1-2 تحت الخدمة، 2-3 أُنجزت اليوم.
  FOREACH bid IN ARRAY branch_ids LOOP
    services := CASE WHEN bid = b3 THEN wash_services ELSE oil_services END;  -- تخصص الفرع
    FOR i IN 1..(2 + floor(random()*3)::int) LOOP  -- انتظار
      n := 1 + floor(random()*24)::int;
      INSERT INTO orders (merchant_id, branch_id, customer_name, customer_phone, car_make, car_model, plate, service_type, status, price, created_at)
      VALUES (mid, bid, names[n], '96655500' || lpad(n::text, 2, '0'), makes[1+floor(random()*8)::int], models[1+floor(random()*8)::int],
              'DMO-' || (2000 + i)::text, services[1+floor(random()*7)::int], 'pending',
              (ARRAY[120,180,260,340])[1+floor(random()*4)::int], now() - (random()*50 || ' minutes')::interval);
    END LOOP;
    FOR i IN 1..(1 + floor(random()*2)::int) LOOP  -- تحت الخدمة
      n := 1 + floor(random()*24)::int;
      INSERT INTO orders (merchant_id, branch_id, customer_name, customer_phone, car_make, car_model, plate, service_type, status, price, created_at, started_at)
      VALUES (mid, bid, names[n], '96655500' || lpad(n::text, 2, '0'), makes[1+floor(random()*8)::int], models[1+floor(random()*8)::int],
              'DMO-' || (3000 + i)::text, services[1+floor(random()*7)::int], 'in_progress',
              (ARRAY[160,240,320,450])[1+floor(random()*4)::int], now() - interval '70 minutes', now() - (random()*40 || ' minutes')::interval);
    END LOOP;
    FOR i IN 1..(2 + floor(random()*2)::int) LOOP  -- أُنجزت اليوم
      n := 1 + floor(random()*24)::int;
      created := date_trunc('day', now()) + (2 + random()*8 || ' hours')::interval;
      INSERT INTO orders (merchant_id, branch_id, customer_name, customer_phone, car_make, car_model, plate, service_type, status, price, created_at, started_at, completed_at)
      VALUES (mid, bid, names[n], '96655500' || lpad(n::text, 2, '0'), makes[1+floor(random()*8)::int], models[1+floor(random()*8)::int],
              'DMO-' || (4000 + i)::text, services[1+floor(random()*7)::int], 'completed',
              (ARRAY[140,200,300,380])[1+floor(random()*4)::int], created, created + interval '8 minutes', created + interval '50 minutes');
    END LOOP;
  END LOOP;

  RAISE NOTICE 'تم زرع بيانات العرض التجريبي بنجاح ✔';
END $$;
