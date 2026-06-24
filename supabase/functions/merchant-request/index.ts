import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

function normalizePhone(phone: string): string {
  phone = (phone || "").trim().replace(/[\s\-\(\)]/g, "");
  if (phone.startsWith("05")) return "+966" + phone.slice(1);
  if (phone.startsWith("966") && !phone.startsWith("+")) return "+" + phone;
  return phone;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...CORS },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { shop_name, owner_name, commercial_reg, location, phone, email, password, services } =
      await req.json();

    /* ── Validation ── */
    if (!shop_name?.trim()) throw new Error("اسم المركز مطلوب");
    if (!phone?.trim()) throw new Error("رقم الجوال مطلوب");
    if (!email?.trim()) throw new Error("البريد الإلكتروني مطلوب");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      throw new Error("البريد الإلكتروني غير صحيح");
    if (!password || String(password).length < 8)
      throw new Error("كلمة المرور يجب أن تكون 8 خانات على الأقل");

    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email.trim().toLowerCase();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    /* ── Reject duplicate applications (same email or phone) ── */
    const { data: dupEmail } = await sb
      .from("join_requests").select("id, status").eq("email", normalizedEmail).maybeSingle();
    if (dupEmail) throw new Error("هذا البريد الإلكتروني مسجّل بالفعل — هل تريد تسجيل الدخول؟");

    const { data: dupPhone } = await sb
      .from("join_requests").select("id, status").eq("phone", normalizedPhone).maybeSingle();
    if (dupPhone) throw new Error("رقم الجوال هذا مسجّل بالفعل — هل تريد تسجيل الدخول؟");

    /* ── Create the login account (confirmed, role pending until approval) ── */
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        role: "pending",
        shop_name: shop_name.trim(),
        full_name: (owner_name || shop_name).trim(),
        phone: normalizedPhone,
        center_type: (Array.isArray(services) && services[0]) ? String(services[0]) : "أخرى",
      },
    });
    if (cErr) {
      if (/registered|already|exists/i.test(cErr.message || ""))
        throw new Error("هذا البريد الإلكتروني مسجّل بالفعل — هل تريد تسجيل الدخول؟");
      throw new Error("تعذّر إنشاء الحساب: " + cErr.message);
    }

    /* ── Record the join request for admin review ── */
    const { error: iErr } = await sb.from("join_requests").insert({
      shop_name: shop_name.trim(),
      owner_name: (owner_name || shop_name).trim(),
      commercial_registration: commercial_reg?.trim() || null,
      location: location?.trim() || null,
      phone: normalizedPhone,
      email: normalizedEmail,
      services: Array.isArray(services) ? services.filter(Boolean) : [],
      status: "pending",
    });
    if (iErr) {
      /* rollback the orphan account so the user can retry cleanly */
      try { await sb.auth.admin.deleteUser(created.user.id); } catch (_) { /* ignore */ }
      throw new Error("خطأ في حفظ الطلب: " + iErr.message);
    }

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message ?? "حدث خطأ" }, 400);
  }
});
