'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Owner dashboard data. Two concerns, deliberately separated:
 *   • The branch-scoped "today" KPIs + recent activity (used by the manager view) —
 *     refetched server-side when the branch changes.
 *   • The FULL order matrix (≤1y, ALL branches, with branch_id) — fetched ONCE per
 *     center. The DNA container slices it client-side by the selected branch, so
 *     multi-branch toggling is instant (no refetch, no loader).
 */
export function useDashboard(centerId, branchId) {
  const [state, setState] = useState({
    loading: true,
    kpis: { carsToday: 0, revenueToday: 0, customers: 0, completion: 0, completedToday: 0, totalToday: 0 },
    activity: [],
  });
  const [orders, setOrders] = useState([]); // full all-branch matrix
  const [workers, setWorkers] = useState([]); // all center workers (with branch_id)

  // ── Full matrix + workforce — once per center (branch filtering is client-side) ──
  useEffect(() => {
    if (!centerId) { setOrders([]); setWorkers([]); return undefined; }
    let alive = true;
    (async () => {
      const now = new Date();
      const yearStart = new Date(now); yearStart.setDate(now.getDate() - 366); yearStart.setHours(0, 0, 0, 0);
      const [{ data: ord }, { data: wrk }] = await Promise.all([
        supabase.from('orders')
          .select('id, created_at, started_at, ready_at, completed_at, status, price, service_type, assigned_to, customer_name, branch_id')
          .eq('merchant_id', centerId).gte('created_at', yearStart.toISOString()),
        supabase.from('workers').select('user_id, full_name, status, branch_id').eq('center_id', centerId).eq('status', 'active'),
      ]);
      if (!alive) return;
      setOrders(Array.isArray(ord) ? ord : []);
      setWorkers((Array.isArray(wrk) ? wrk : []).filter((w) => w.user_id));
    })();
    return () => { alive = false; };
  }, [centerId]);

  // ── Branch-scoped "today" KPIs + activity (manager view) ──
  const run = useCallback(async () => {
    if (!centerId) { setState((s) => ({ ...s, loading: false })); return; }
    setState((s) => ({ ...s, loading: true }));

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const onB = (q) => (branchId && branchId !== 'all' ? q.eq('branch_id', branchId) : q);

    const visitsP = onB(
      supabase.from('visits').select('created_at,price,discount').eq('merchant_id', centerId).gte('created_at', weekStart.toISOString())
    );
    const ordersTodayP = onB(
      supabase.from('orders').select('status').eq('merchant_id', centerId).gte('created_at', todayStart.toISOString())
    );
    let custQ = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('merchant_id', centerId);
    if (branchId && branchId !== 'all') custQ = custQ.eq('branch_id', branchId);
    const recentP = onB(
      supabase.from('orders')
        .select('id,car_make,car_model,plate,status,assigned_to,created_at,started_at,ready_at,completed_at,updated_at')
        .eq('merchant_id', centerId)
        .order('updated_at', { ascending: false })
        .limit(12)
    );
    const workersP = supabase.from('workers').select('user_id,full_name,phone').eq('center_id', centerId);

    const [{ data: visits }, { data: ordersToday }, { count: customers }, { data: recent }, { data: workers }] =
      await Promise.all([visitsP, ordersTodayP, custQ, recentP, workersP]);

    const v = visits || [];
    const todayV = v.filter((r) => new Date(r.created_at) >= todayStart);
    const revenueToday = todayV.reduce((s, r) => s + ((r.price || 0) - (r.discount || 0)), 0);

    const ot = ordersToday || [];
    const totalToday = ot.length;
    const completedToday = ot.filter((o) => o.status === 'completed').length;
    const completion = totalToday ? Math.round((completedToday / totalToday) * 100) : 0;

    const wmap = {};
    (workers || []).forEach((w) => { if (w.user_id) wmap[w.user_id] = w.full_name || w.phone || 'فني'; });
    const activity = (recent || [])
      .map((o) => {
        const car = [o.car_make, o.car_model].filter(Boolean).join(' ') || o.plate || 'مركبة';
        const tech = wmap[o.assigned_to] || 'الفني';
        let ts, text, tone;
        if (o.status === 'completed') { ts = o.completed_at || o.updated_at || o.created_at; text = `${tech} سلّم ${car}`; tone = 'emerald'; }
        else if (o.status === 'ready') { ts = o.ready_at || o.updated_at || o.created_at; text = `${tech} جهّز ${car} للاستلام`; tone = 'slate'; }
        else if (o.status === 'in_progress') { ts = o.started_at || o.updated_at || o.created_at; text = `${tech} بدأ العمل على ${car}`; tone = 'blue'; }
        else { ts = o.created_at; text = `طلب جديد: ${car}`; tone = 'amber'; }
        return { id: o.id, ts: ts ? new Date(ts).getTime() : 0, text, tone };
      })
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 5);

    setState({
      loading: false,
      kpis: { carsToday: totalToday, revenueToday: Math.round(revenueToday), customers: customers || 0, completion, completedToday, totalToday },
      activity,
    });
  }, [centerId, branchId]);

  useEffect(() => { run(); }, [run]);

  return { ...state, orders, workers, refetch: run };
}
