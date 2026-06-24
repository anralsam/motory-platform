import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function normalizePhone(phone: string): string {
  phone = phone.trim().replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("05")) return "+966" + phone.slice(1);
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
    const { phone, code } = body;

    if (!phone || !code) throw new Error("رقم الجوال والكود مطلوبان");

    const normalizedPhone = normalizePhone(phone);
    const cleanCode = String(code).trim().replace(/\D/g, "");

    if (cleanCode.length !== 6) throw new Error("الكود يجب أن يكون 6 أرقام");

    console.log(`[VERIFY] Phone: ${normalizedPhone}, Code: ${cleanCode}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: otpRow, error: fetchError } = await sb
      .from("otp_codes")
      .select("code, expires_at")
      .eq("phone", normalizedPhone)
      .single();

    if (fetchError || !otpRow) {
      throw new Error("لم يتم إرسال كود لهذا الرقم أو انتهت صلاحيته");
    }

    if (new Date() > new Date(otpRow.expires_at)) {
      await sb.from("otp_codes").delete().eq("phone", normalizedPhone);
      throw new Error("انتهت صلاحية الكود، اطلب كوداً جديداً");
    }

    if (otpRow.code !== cleanCode) {
      throw new Error("كود التحقق غير صحيح");
    }

    await sb.from("otp_codes").delete().eq("phone", normalizedPhone);

    // Fetch merchant data for session storage
    const { data: merchant } = await sb
      .from("join_requests")
      .select("shop_name, owner_name, email, services, location")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    console.log(`[VERIFY] Success for ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ success: true, phone: normalizedPhone, merchant: merchant ?? null }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("[VERIFY] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "فشل التحقق" }),
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
