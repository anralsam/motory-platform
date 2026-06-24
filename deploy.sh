#!/bin/bash

echo "🚀 بدء نشر Edge Functions..."

# تثبيت Supabase CLI إذا لم يكن موجود
if ! command -v supabase &> /dev/null; then
    echo "📦 تثبيت Supabase CLI..."
    npm install -g supabase
fi

echo "🔗 ربط المشروع..."
supabase link --project-ref pycyttykvmbhykltnxzj

echo "📤 نشر merchant-request (جديد)..."
supabase functions deploy merchant-request

echo "📤 نشر merchant-login (جديد)..."
supabase functions deploy merchant-login

echo "📤 نشر otp-verify (محدّث)..."
supabase functions deploy otp-verify

echo "📤 نشر admin-merchants (جديد)..."
supabase functions deploy admin-merchants

echo ""
echo "✅ تم نشر Edge Functions بنجاح!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "تذكّر: شغّل هذا SQL في Supabase Dashboard قبل الاختبار:"
echo ""
echo "CREATE TABLE IF NOT EXISTS merchants ("
echo "  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,"
echo "  email         text UNIQUE NOT NULL,"
echo "  phone         text UNIQUE NOT NULL,"
echo "  shop_name     text NOT NULL,"
echo "  owner_name    text NOT NULL,"
echo "  commercial_reg text,"
echo "  location      text,"
echo "  services      text[] DEFAULT '{}',"
echo "  status        text DEFAULT 'pending'"
echo "                     CHECK (status IN ('pending','approved','rejected')),"
echo "  notes         text,"
echo "  created_at    timestamptz DEFAULT now()"
echo ");"
echo "ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
