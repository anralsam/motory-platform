import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_SID = Deno.env.get("TWILIO_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
const TWILIO_MSG_SID = Deno.env.get("TWILIO_MSG_SID") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function normalizePhone(phone: string): string {
  phone = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("05")) return "+966" + phone.slice(1);
  if (phone.startsWith("966") && !phone.startsWith("+")) return "+" + phone;
  return phone;
}

function isEmail(val: string): boolean {
  return val.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { identifier } = await req.json();
    if (!identifier?.trim()) throw new Error("أدخل البريد الإلكتروني أو رقم الجوال");

    const raw = identifier.trim();
    const method = isEmail(raw) ? "email" : "phone";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const adminSb = createClient(supabaseUrl, serviceKey);

    let merchant: any = null;
    if (method === "email") {
      const { data } = await adminSb
        .from("join_requests")
        .select("*")
        .eq("email", raw.toLowerCase())
        .maybeSingle();
      merchant = data;
    } else {
      const { data } = await adminSb
        .from("join_requests")
        .select("*")
        .eq("phone", normalizePhone(raw))
        .maybeSingle();
      merchant = data;
    }

    if (!merchant) {
      throw new Error(
        "لا يوجد حساب مرتبط بهذا البريد أو الرقم — هل سجّلت طلب انضمامك؟"
      );
    }

    if (merchant.status === "pending") {
      throw new Error("PENDING|طلبك قيد المراجعة الإدارية. سيتم إشعارك عند التفعيل");
    }
    if (merchant.status === "rejected") {
      throw new Error("REJECTED|تم رفض طلب تسجيلك. تواصل مع الدعم للمزيد");
    }
    if (merchant.status !== "approved") {
      throw new Error("الحساب غير مفعّل — تواصل مع الإدارة");
    }

    if (method === "email") {
      // Trigger Supabase email OTP via REST (anon key — same as browser call)
      const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ email: merchant.email, create_user: true }),
      });
      if (!otpRes.ok) {
        const otpData = await otpRes.json() as any;
        throw new Error(otpData.msg ?? "فشل إرسال كود البريد الإلكتروني");
      }

      const masked = merchant.email.replace(/(.{2}).+(@.+)/, "$1***$2");
      return new Response(
        JSON.stringify({ success: true, method: "email", masked }),
        { headers: { "Content-Type": "application/json", ...CORS } }
      );
    } else {
      // Send SMS via Twilio
      const phone = normalizePhone(raw);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: dbErr } = await adminSb
        .from("otp_codes")
        .upsert({ phone, code, expires_at: expiresAt.toISOString() });
      if (dbErr) throw new Error("خطأ في قاعدة البيانات");

      const twilioAuth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
      const smsText = `كود التحقق VOLD MOTOR: ${code}\nصالح لمدة 10 دقائق`;
      const smsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `MessagingServiceSid=${encodeURIComponent(TWILIO_MSG_SID)}&To=${encodeURIComponent(phone)}&Body=${encodeURIComponent(smsText)}`,
        }
      );
      const smsData = await smsRes.json() as any;
      if (smsData.status === "failed" || smsData.status === "undelivered") {
        throw new Error(smsData.error_message ?? "فشل إرسال الرسالة");
      }

      const masked = phone.slice(0, 5) + "****" + phone.slice(-3);
      return new Response(
        JSON.stringify({ success: true, method: "phone", masked, phone }),
        { headers: { "Content-Type": "application/json", ...CORS } }
      );
    }
  } catch (err: any) {
    let msg: string = err.message ?? "حدث خطأ";
    let code = "error";
    if (msg.startsWith("PENDING|")) { code = "pending"; msg = msg.slice(8); }
    else if (msg.startsWith("REJECTED|")) { code = "rejected"; msg = msg.slice(9); }

    return new Response(JSON.stringify({ error: msg, code }), {
      headers: { "Content-Type": "application/json", ...CORS },
      status: 400,
    });
  }
});
