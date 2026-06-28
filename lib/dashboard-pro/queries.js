/**
 * Dashboard-Pro data layer (SERVER-ONLY). Pure data — no UI. All reads go through
 * the service-role admin client. Keeping queries here separates logic from the
 * presentational components in app/dashboard-pro and components/dashboard-pro.
 */
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ── Admin Intelligence dataset (cached 60s — loads instantly on poor networks) ──
// Returns the RAW rows; the client Intelligence module filters/aggregates them
// in-memory so the Time-range / Branch / Mechanic filters refresh INSTANTLY with
// zero extra network round-trips.
export const getIntelligenceData = unstable_cache(
  async () => {
    const admin = getSupabaseAdmin();
    if (!admin) return null;
    const [{ data: orders }, { data: workers }, { data: branches }] = await Promise.all([
      admin.from('orders').select('id, status, branch_id, assigned_to, created_at, started_at, completed_at, price'),
      admin.from('workers').select('user_id, full_name').eq('status', 'active'),
      admin.from('branches').select('id, name'),
    ]);
    return {
      orders: orders || [],
      workers: (workers || []).filter((w) => w.user_id),
      branches: branches || [],
    };
  },
  ['dashboard-pro-intelligence'],
  { revalidate: 60, tags: ['orders'] },
);

const ORDER_STATUSES = [
  { key: 'pending', label: 'انتظار', color: '#f59e0b' },
  { key: 'in_progress', label: 'جاري', color: '#4f46e5' },
  { key: 'ready', label: 'جاهز', color: '#7c3aed' },
  { key: 'completed', label: 'مكتمل', color: '#10b981' },
];

function distribution(orders) {
  return ORDER_STATUSES.map((s) => ({
    name: s.label,
    value: orders.filter((o) => o.status === s.key).length,
    color: s.color,
  }));
}

// ── Admin: Global Fleet Health ──
export async function getAdminData() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const [{ data: orders }, { data: workers }, { data: jr }] = await Promise.all([
    admin.from('orders').select('status, price'),
    admin.from('workers').select('id, status'),
    admin.from('join_requests').select('id, shop_name, owner_name, email, status, created_at').order('created_at', { ascending: false }),
  ]);

  const o = orders || [];
  const j = jr || [];
  if (!o.length && !j.length) return null;

  const completed = o.filter((x) => x.status === 'completed').length;
  const fleet = {
    revenue: o.filter((x) => x.status === 'completed').reduce((s, x) => s + (Number(x.price) || 0), 0),
    activeMechanics: (workers || []).filter((w) => w.status === 'active').length,
    efficiencyPct: o.length ? Math.round((completed / o.length) * 100) : 0,
    activeOrders: o.filter((x) => x.status === 'in_progress' || x.status === 'ready').length,
  };
  const joinStats = {
    total: j.length,
    approved: j.filter((x) => x.status === 'approved').length,
    pending: j.filter((x) => x.status === 'pending').length,
    rejected: j.filter((x) => x.status === 'rejected').length,
  };
  const acceptanceRows = [...j].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));

  return { fleet, statusDist: distribution(o), joinStats, acceptanceRows };
}

// ── Merchant: Command Center ──
export async function getMerchantData(merchantId) {
  const admin = getSupabaseAdmin();
  if (!admin || !merchantId) return null;

  const [{ data: orders }, { data: workers }, { data: inv }] = await Promise.all([
    admin.from('orders')
      .select('id, customer_name, car_make, car_model, plate, service_type, status, price, assigned_to, created_at')
      .eq('merchant_id', merchantId).order('created_at', { ascending: false }),
    admin.from('workers').select('user_id, full_name, status').eq('center_id', merchantId).eq('status', 'active'),
    admin.from('inventory').select('id, name, unit, quantity, min_quantity').eq('merchant_id', merchantId),
  ]);

  const o = orders || [];
  if (!o.length) return { empty: true };

  const total = o.length;
  const live = o.filter((x) => x.status === 'in_progress' || x.status === 'ready').length;
  const perf = {
    revenue: o.filter((x) => x.status === 'completed').reduce((s, x) => s + (Number(x.price) || 0), 0),
    bookings: total,
    utilization: total ? Math.round((live / total) * 100) : 0,
    live,
  };
  const stockAlerts = (inv || []).filter((i) => (i.quantity || 0) <= (i.min_quantity || 0));

  return { perf, stockAlerts, orders: o, workers: (workers || []).filter((w) => w.user_id) };
}

// ── Technician: assigned tasks + their center's inventory ──
export async function getWorkerData(userId) {
  const admin = getSupabaseAdmin();
  if (!admin || !userId) return { orders: [], inventory: [] };

  const { data: w } = await admin.from('workers').select('center_id').eq('user_id', userId).eq('status', 'active').maybeSingle();
  const centerId = w?.center_id || null;

  const [{ data: orders }, inv] = await Promise.all([
    admin.from('orders')
      .select('id, customer_name, car_make, car_model, plate, service_type, status, created_at, started_at')
      .eq('assigned_to', userId).order('created_at', { ascending: false }),
    centerId
      ? admin.from('inventory').select('id, name, unit, quantity').eq('merchant_id', centerId).order('name')
      : Promise.resolve({ data: [] }),
  ]);

  return { orders: orders || [], inventory: inv?.data || [] };
}
