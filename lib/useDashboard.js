'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Aggregates the Owner dashboard: KPIs, 7-day completed-ops series, recent activity.
 * Strictly branch-reactive (filters by branch_id, or aggregates when "all").
 */
export function useDashboard(centerId, branchId) {
  const [state, setState] = useState({
    loading: true,
    kpis: { carsToday: 0, revenueToday: 0, customers: 0, completion: 0, completedToday: 0, totalToday: 0 },
    series: [],
    activity: [],
  });

  const run = useCallback(async () => {
    if (!centerId) { setState((s) => ({ ...s, loading: false })); return; }
    setState((s) => ({ ...s, loading: true }));

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    const onB = (q) => (branchId && branchId !== 'all' ? q.eq('branch_id', branchId) : q);

    // visits over last 7 days → today's revenue + the chart (completed operations)
    const visitsP = onB(
      supabase.from('visits').select('created_at,price,discount').eq('merchant_id', centerId).gte('created_at', weekStart.toISOString())
    );
    // today's orders → cars today + completion rate
    const ordersTodayP = onB(
      supabase.from('orders').select('status').eq('merchant_id', centerId).gte('created_at', todayStart.toISOString())
    );
    // customers count (branch-scoped)
    let custQ = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('merchant_id', centerId);
    if (branchId && branchId !== 'all') custQ = custQ.eq('branch_id', branchId);
    // recent orders → activity feed
    const recentP = onB(
      supabase.from('orders')
        .select('id,car_make,car_model,plate,status,assigned_to,created_at,started_at,ready_at,completed_at,updated_at')
        .eq('merchant_id', centerId)
        .order('updated_at', { ascending: false })
        .limit(12)
    );
    // worker names for the activity feed
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

    // 7-day daily completed operations (from visits = completed services)
    const buckets = [];
    const DN = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      buckets.push({ key: dayKey(d), label: DN[d.getDay()], ops: 0 });
    }
    const bmap = Object.fromEntries(buckets.map((b) => [b.key, b]));
    v.forEach((r) => { const k = dayKey(new Date(r.created_at)); if (bmap[k]) bmap[k].ops += 1; });

    // activity feed
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
      series: buckets,
      activity,
    });
  }, [centerId, branchId]);

  useEffect(() => { run(); }, [run]);

  return { ...state, refetch: run };
}
