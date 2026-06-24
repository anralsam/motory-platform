import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_TOKEN") ?? "";
const TWILIO_MSG_SERVICE_SID = Deno.env.get("TWILIO_MSG_SID") ?? "";

function normalizePhone(phone: string): string {
  phone = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("05")) phone = "+966" + phone.slice(1);
  else if (phone.startsWith("966") && !phone.startsWith("+")) phone = "+" + phone;
  return phone;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
      status: 204,
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json() as any;
    const { phone } = body;

    if (!phone) throw new Error("رقم الجوال مطلوب");

    const normalizedPhone = normalizePhone(phone);

    // توليد كود OTP عشوائي 6 أرقام
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

    // حفظ الكود في Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sb = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await sb
      .from("otp_codes")
      .upsert({ phone: normalizedPhone, code, expires_at: expiresAt.toISOString() });

    if (dbError) throw new Error("خطأ في قاعدة البيانات: " + dbError.message);

    // إرسال SMS عبر Twilio Programmable Messaging
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const smsBody = `كود التحقق VOLD MOTOR: ${code}\nصالح لمدة 10 دقائق`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `MessagingServiceSid=${encodeURIComponent(TWILIO_MSG_SERVICE_SID)}&To=${encodeURIComponent(normalizedPhone)}&Body=${encodeURIComponent(smsBody)}`,
      }
    );

    const data = await response.json() as any;
    console.log(`[SEND] Twilio status=${data.status}, sid=${data.sid}, error=${data.error_code}`);

    if (data.status === "failed" || data.status === "undelivered") {
      throw new Error(data.error_message || "فشل إرسال الرسالة");
    }

    return new Response(
      JSON.stringify({ success: true, phone: normalizedPhone }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      }
    );

  } catch (err: any) {
    console.error("[SEND] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "حدث خطأ" }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      }
    );
  }
});
