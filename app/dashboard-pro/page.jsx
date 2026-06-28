/**
 * VOLD MOTOR — Dashboard Pro (Server Component).
 *
 * Data is fetched SERVER-SIDE via the service-role admin client (bypasses RLS).
 * Server Component code never ships to the browser, so the key stays safe. The
 * page detects the user's role and composes the matching module, then hands the
 * rendered node to <DashboardShell> (a client component that owns the chrome:
 * desktop sidebar, mobile bottom-nav, and the i18n dir toggle).
 *
 * If the admin env key isn't configured or the table is empty, modules render a
 * styled <NoData> component — never bare 0s.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import DashboardShell from '@/components/dashboard-pro/DashboardShell';
import AcceptanceTable from '@/components/dashboard-pro/AcceptanceTable';
import WorkerModule from '@/components/dashboard-pro/WorkerModule';
import NoData from '@/components/dashboard-pro/NoData';

export const dynamic = 'force-dynamic';

const ADMIN_DOMAIN = process.env.ADMIN_EMAIL_DOMAIN || 'voldmotor.com';

async function detectRole(supabase, user) {
  if (!user) return 'merchant';
  if (
    (user.email || '').toLowerCase().endsWith('@' + ADMIN_DOMAIN) ||
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin'
  ) return 'admin';
  const { data: urow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (urow?.role === 'admin') return 'admin';
  if (urow?.role === 'worker') return 'worker';
  return 'merchant';
}

// ── Presentational stat card (server-safe) ──
const DOT = { blue: 'bg-blue-600', emerald: 'bg-emerald-600', amber: 'bg-amber-500', rose: 'bg-rose-600' };
function StatCard({ label, value, accent = 'blue' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${DOT[accent]}`} />
      </div>
      <div className="mt-4 font-inter text-3xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{value}</div>
    </div>
  );
}

// ── Admin module (real data via service-role) ──
async function renderAdminModule() {
  const admin = getSupabaseAdmin();
  let stats = null;
  let rows = [];
  if (admin) {
    const { data, error } = await admin
      .from('join_requests')
      .select('id, shop_name, owner_name, email, status, created_at')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data) && data.length) {
      const c = { total: data.length, approved: 0, pending: 0, rejected: 0 };
      data.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
      stats = c;
      rows = data;
    }
  }

  if (!stats) {
    return <NoData hint="فعّل مفتاح الخدمة (SUPABASE_SERVICE_ROLE_KEY) في إعدادات Vercel لعرض البيانات الحقيقية، أو لا توجد طلبات بعد." />;
  }

  // Pending first, then the rest — the acceptance queue.
  const ordered = [...rows].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));

  return (
    <>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={stats.total.toLocaleString('en-US')} accent="blue" />
        <StatCard label="المراكز المفعّلة" value={stats.approved.toLocaleString('en-US')} accent="emerald" />
        <StatCard label="الطلبات المعلّقة" value={stats.pending.toLocaleString('en-US')} accent="amber" />
        <StatCard label="الطلبات المرفوضة" value={stats.rejected.toLocaleString('en-US')} accent="rose" />
      </section>
      <section>
        <h3 className="mb-3 text-base font-extrabold text-slate-900">طلبات الانضمام</h3>
        <AcceptanceTable initialRows={ordered} />
      </section>
    </>
  );
}

// ── Shop module (performance cards) ──
function renderShopModule() {
  // No client-side data source confirmed yet → styled No-Data, never fake numbers.
  return (
    <>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {['الأرباح', 'الحجوزات', 'استغلال الفنيين'].map((label) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-6">
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <div className="mt-4 font-inter text-3xl font-bold text-slate-300" dir="ltr">—</div>
          </div>
        ))}
      </section>
      <NoData title="بيانات الأداء غير متاحة بعد" hint="سنربط الأرباح والحجوزات واستغلال الفنيين بمصادرها الحقيقية في الخطوة التالية." />
    </>
  );
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  let moduleNode;
  if (role === 'admin') moduleNode = await renderAdminModule();
  else if (role === 'worker') moduleNode = <WorkerModule />;
  else moduleNode = renderShopModule();

  return (
    <DashboardShell role={role} userName={userName}>
      {moduleNode}
    </DashboardShell>
  );
}
