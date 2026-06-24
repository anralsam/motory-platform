import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function normalizePhone(p: string): string {
  p = p.trim().replace(/[\s\-\(\)]/g, "");
  if (p.startsWith("05")) p = "+966" + p.slice(1);
  else if (p.startsWith("966") && !p.startsWith("+")) p = "+" + p;
  return p;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors, status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json() as { identifier?: string };
    const raw = (body.identifier ?? "").trim();
    if (!raw) throw new Error("أدخل البريد الإلكتروني أو رقم الجوال");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const isEmail = raw.includes("@");
    const identifier = isEmail ? raw.toLowerCase() : normalizePhone(raw);

    const column = isEmail ? "email" : "phone";
    const { data, error } = await sb
      .from("join_requests")
      .select("email, phone, shop_name, status")
      .eq(column, identifier)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error("لم يتم العثور على طلب انضمام بهذا البريد أو رقم الجوال");
    }

    if (data.status === "pending") {
      throw new Error("طلبك قيد المراجعة من قِبَل الإدارة، سنتواصل معك قريباً");
    }
    if (data.status === "rejected") {
      throw new Error("عذراً، لم يتم قبول طلب انضمامك");
    }

    // approved — return the email so frontend can send OTP
    return new Response(
      JSON.stringify({ email: data.email, shop_name: data.shop_name }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error("[AUTH-CHECK]", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "حدث خطأ" }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
