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
import AssignControl from '@/components/dashboard-pro/AssignControl';
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
  // Technicians live in the `workers` table (auth bridge), not `users`.
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: w } = await admin.from('workers').select('id').eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (w) return 'worker';
  }
  const { data: urow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle();
  if (urow?.role === 'admin') return 'admin';
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

// ── A merchant's own workshop orders (service-role, scoped by merchant_id) ──
async function fetchMerchantOrders(merchantId) {
  const admin = getSupabaseAdmin();
  if (!admin || !merchantId) return [];
  const { data, error } = await admin
    .from('orders')
    .select('id, customer_name, car_make, car_model, plate, service_type, status, price, assigned_to, created_at, started_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false });
  return !error && Array.isArray(data) ? data : [];
}

// ── Active technicians of a merchant's center ──
async function fetchMerchantWorkers(merchantId) {
  const admin = getSupabaseAdmin();
  if (!admin || !merchantId) return [];
  const { data } = await admin
    .from('workers')
    .select('user_id, full_name, status')
    .eq('center_id', merchantId)
    .eq('status', 'active');
  return Array.isArray(data) ? data.filter((w) => w.user_id) : [];
}

// ── Orders assigned to a specific technician (their tasks) ──
async function fetchAssignedOrders(workerUserId) {
  const admin = getSupabaseAdmin();
  if (!admin || !workerUserId) return [];
  const { data } = await admin
    .from('orders')
    .select('id, customer_name, car_make, car_model, plate, service_type, status, created_at, started_at')
    .eq('assigned_to', workerUserId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data : [];
}

// ── A technician's center, and that center's inventory (for parts deduction) ──
async function fetchWorkerCenter(workerUserId) {
  const admin = getSupabaseAdmin();
  if (!admin || !workerUserId) return null;
  const { data } = await admin.from('workers').select('center_id').eq('user_id', workerUserId).eq('status', 'active').maybeSingle();
  return data?.center_id || null;
}
async function fetchCenterInventory(centerId) {
  const admin = getSupabaseAdmin();
  if (!admin || !centerId) return [];
  const { data } = await admin.from('inventory').select('id, name, unit, quantity').eq('merchant_id', centerId).order('name');
  return Array.isArray(data) ? data : [];
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

// ── Shop module (merchant) — Performance + Finance + task ASSIGNMENT ──
//    Status execution belongs to the technician, not the shop owner.
async function renderShopModule(merchantId) {
  const [orders, workers] = await Promise.all([
    fetchMerchantOrders(merchantId),
    fetchMerchantWorkers(merchantId),
  ]);
  if (!orders.length) {
    return <NoData title="لا توجد طلبات" hint="لا توجد طلبات ورشة على حسابك بعد." />;
  }
  const total = orders.length;
  const active = orders.filter((o) => o.status === 'in_progress' || o.status === 'ready').length;
  const revenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + (Number(o.price) || 0), 0);
  const utilization = total ? Math.round((active / total) * 100) : 0;
  const nameByUser = Object.fromEntries(workers.map((w) => [w.user_id, w.full_name]));

  return (
    <>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="الأرباح (مكتملة)" value={`${revenue.toLocaleString('en-US')} ﷼`} accent="emerald" />
        <StatCard label="الحجوزات" value={total.toLocaleString('en-US')} accent="blue" />
        <StatCard label="استغلال الفنيين" value={`${utilization}%`} accent="amber" />
      </section>
      <section>
        <h3 className="mb-3 text-base font-extrabold text-slate-900">تكليف المهام</h3>
        <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {orders.slice(0, 15).map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="font-bold text-slate-900">{o.customer_name || 'عميل'}</div>
                <div className="text-xs text-slate-500">
                  {[o.car_make, o.car_model].filter(Boolean).join(' ') || '—'}
                  {o.plate ? <span dir="ltr"> · {o.plate}</span> : null}
                  {o.service_type ? <span> · {o.service_type}</span> : null}
                </div>
              </div>
              {o.assigned_to ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  مكلّف: {nameByUser[o.assigned_to] || 'فنّي'}
                </span>
              ) : (
                <AssignControl orderId={o.id} workers={workers} />
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default async function DashboardProPage() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await detectRole(supabase, user);
  const userName = (user?.email || '').split('@')[0] || 'المستخدم';

  let moduleNode;
  if (role === 'admin') {
    moduleNode = await renderAdminModule();
  } else if (role === 'worker') {
    const centerId = await fetchWorkerCenter(user?.id);
    const [assigned, inventory] = await Promise.all([
      fetchAssignedOrders(user?.id),
      fetchCenterInventory(centerId),
    ]);
    moduleNode = <WorkerModule orders={assigned} inventory={inventory} />;
  } else {
    moduleNode = await renderShopModule(user?.id);
  }

  return (
    <DashboardShell role={role} userName={userName}>
      {moduleNode}
    </DashboardShell>
  );
}
