import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

/* ── Branded welcome email (sent on approval via Resend) ── */
function welcomeHtml(shop: string): string {
  const name = (shop || "مركزك").trim();
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(2,6,23,.08);">
        <tr><td align="center" style="background:#ffffff;padding:30px 20px 22px;border-bottom:1px solid #eef2f7;">
          <img src="https://www.voldmotor.com/logo.png" alt="VOLD MOTOR" height="30" style="height:30px;width:auto;display:block;border:0;">
        </td></tr>
        <tr><td style="padding:34px 30px 10px;text-align:center;">
          <div style="font-size:40px;line-height:1;margin-bottom:10px;">🎉</div>
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0f172a;">تم قبول مركزك!</h1>
          <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.8;">يسعدنا انضمام <strong style="color:#0f172a;">${name}</strong> إلى منصة VOLD MOTOR.</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.8;">تمت الموافقة على طلبك، وأصبح بإمكانك الآن تسجيل الدخول وإدارة مركزك: الحجوزات، العملاء، العمليات والتقارير — من مكان واحد.</p>
          <a href="https://www.voldmotor.com/login.html" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 30px;border-radius:12px;">تسجيل الدخول إلى لوحتك</a>
          <p style="margin:22px 0 0;font-size:13px;color:#94a3b8;line-height:1.7;">سجّل الدخول بنفس البريد وكلمة المرور اللذين استخدمتهما عند التسجيل.</p>
        </td></tr>
        <tr><td align="center" style="padding:22px 20px 26px;border-top:1px solid #eef2f7;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© VOLD MOTOR — منصة إدارة مراكز العناية بالمركبات</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendWelcome(email: string, shop: string) {
  // Secret comes ONLY from the function environment (set via `supabase secrets set
  // RESEND_API_KEY=...`). No hardcoded fallback — if it's missing we skip sending.
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { sent: false, reason: "no_key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "VOLD MOTOR <noreply@voldmotor.com>",
        to: [email],
        subject: "🎉 تم قبول مركزك في VOLD MOTOR",
        html: welcomeHtml(shop),
      }),
    });
    if (!res.ok) return { sent: false, reason: await res.text() };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const sb          = createClient(supabaseUrl, serviceKey);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...CORS }, status: 401,
    });
  }

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...CORS }, status: 401,
    });
  }

  // ── Admin check (trusted sources only) ──
  const adminDomain = Deno.env.get("ADMIN_EMAIL_DOMAIN") || "voldmotor.com";
  let isAdmin =
    user.email?.endsWith("@" + adminDomain) ||
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin";
  if (!isAdmin) {
    const { data: urow } = await sb.from("users").select("role").eq("id", user.id).single();
    isAdmin = urow?.role === "admin";
  }

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      headers: { "Content-Type": "application/json", ...CORS }, status: 403,
    });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "list") {
      const { status } = body;
      let query = sb.from("join_requests").select("*").order("created_at", { ascending: false });
      if (status && status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ merchants: data }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (action === "stats") {
      const { data, error } = await sb.from("join_requests").select("status");
      if (error) throw error;
      const counts = { pending: 0, approved: 0, rejected: 0, total: data?.length || 0 };
      (data || []).forEach((r: any) => { if (r.status in counts) (counts as any)[r.status]++; });
      return new Response(JSON.stringify(counts), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (action === "approve") {
      const { id } = body;
      if (!id) throw new Error("id مطلوب");

      // 1) Fetch the request (need email + shop for promotion + welcome email)
      const { data: reqRow, error: rErr } = await sb
        .from("join_requests").select("email, shop_name").eq("id", id).single();
      if (rErr || !reqRow) throw new Error("الطلب غير موجود");

      // 2) Mark approved
      const { error } = await sb.from("join_requests")
        .update({ status: "approved", notes: null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // 3) Promote the owner's account to the merchant role
      await sb.rpc("promote_to_merchant", { p_email: reqRow.email });

      // 4) Send the welcome email (best-effort; never blocks approval)
      const mail = await sendWelcome(reqRow.email, reqRow.shop_name);

      return new Response(JSON.stringify({ success: true, email: mail }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (action === "reject") {
      const { id, notes } = body;
      if (!id) throw new Error("id مطلوب");
      const { error } = await sb.from("join_requests")
        .update({ status: "rejected", notes: notes || null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (action === "suspend") {
      const { id } = body;
      if (!id) throw new Error("id مطلوب");
      const { error } = await sb.from("join_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    throw new Error("action غير معروف: " + action);

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "حدث خطأ" }), {
      headers: { "Content-Type": "application/json", ...CORS }, status: 400,
    });
  }
});
