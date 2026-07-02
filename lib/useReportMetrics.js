'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
const pct = (cm, pm) => {
  if (!pm) return cm > 0 ? 100 : 0;
  return Math.round(((cm - pm) / pm) * 100);
};
function peakHour(list) {
  if (!list.length) return -1;
  const h = Array(24).fill(0);
  list.forEach((v) => { h[new Date(v.created_at).getHours()]++; });
  let mx = -1, idx = -1;
  h.forEach((c, i) => { if (c > mx) { mx = c; idx = i; } });
  return mx > 0 ? idx : -1;
}

/**
 * Real Month-over-Month metrics + current-month daily series, scoped to the active branch.
 * Refetches whenever branchId changes.
 */
export function useReportMetrics(userId, branchId) {
  const [state, setState] = useState({ loading: true, metrics: [], series: [] });

  const run = useCallback(async () => {
    if (!userId) { setState({ loading: false, metrics: [], series: [] }); return; }
    setState((s) => ({ ...s, loading: true }));

    const now = new Date();
    const cmStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Single window covering previous + current month.
    let vq = supabase
      .from('visits')
      .select('created_at,price,discount')
      .eq('merchant_id', userId)
      .gte('created_at', pmStart.toISOString());
    if (branchId && branchId !== 'all') vq = vq.eq('branch_id', branchId);
    const { data: visits } = await vq;
    const all = visits || [];

    const cm = all.filter((v) => new Date(v.created_at) >= cmStart);
    const pm = all.filter((v) => { const d = new Date(v.created_at); return d >= pmStart && d < cmStart; });

    const sales = (arr) => arr.reduce((s, r) => s + ((r.price || 0) - (r.discount || 0)), 0);
    const cmSales = sales(cm), pmSales = sales(pm);
    const cmCount = cm.length, pmCount = pm.length;
    const cmAvg = cmCount ? Math.round(cmSales / cmCount) : 0;
    const pmAvg = pmCount ? Math.round(pmSales / pmCount) : 0;

    // Optional: work duration from orders (started_at → completed_at), if populated.
    let oq = supabase
      .from('orders')
      .select('started_at,completed_at,created_at')
      .eq('merchant_id', userId)
      .gte('created_at', pmStart.toISOString());
    if (branchId && branchId !== 'all') oq = oq.eq('branch_id', branchId);
    const { data: orders } = await oq;
    const durOf = (arr) => {
      const mins = arr
        .filter((o) => o.started_at && o.completed_at)
        .map((o) => (new Date(o.completed_at) - new Date(o.started_at)) / 60000)
        .filter((m) => m > 0 && m < 600);
      return mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;
    };
    const cmOrders = (orders || []).filter((o) => new Date(o.created_at) >= cmStart);
    const pmOrders = (orders || []).filter((o) => { const d = new Date(o.created_at); return d >= pmStart && d < cmStart; });
    const cmDur = durOf(cmOrders), pmDur = durOf(pmOrders);

    // Build metric cards (only data-backed ones).
    const metrics = [];
    metrics.push(metric('العمليات المنجزة', fmt(cmCount), pct(cmCount, pmCount), 'moreGood'));
    metrics.push(metric('إجمالي المبيعات', fmt(cmSales) + ' ⃁', pct(cmSales, pmSales), 'moreGood'));
    metrics.push(metric('متوسط الفاتورة', fmt(cmAvg) + ' ⃁', pct(cmAvg, pmAvg), 'moreGood'));
    if (cmDur != null && pmDur != null) {
      metrics.push(metric('متوسط مدة العمل', cmDur + ' دقيقة', pct(cmDur, pmDur), 'lessGood'));
    }
    // Peak hour (descriptive, neutral).
    const cmPeak = peakHour(cm), pmPeak = peakHour(pm);
    if (cmPeak >= 0) {
      let delta = 'بيانات جديدة';
      if (pmPeak >= 0) {
        delta = cmPeak === pmPeak ? 'ثابتة عن الشهر الماضي'
          : cmPeak > pmPeak ? 'تحوّلت لوقت متأخر'
          : 'تحوّلت لوقت مبكر';
      }
      metrics.push({ label: 'ساعة الذروة', value: `${pad(cmPeak)}:00–${pad((cmPeak + 1) % 24)}:00`, delta, tone: 'neutral', dir: 'flat' });
    }

    // Current-month daily series for the chart.
    const days = now.getDate();
    const series = [];
    for (let d = 1; d <= days; d++) {
      const dayVisits = cm.filter((v) => new Date(v.created_at).getDate() === d);
      series.push({ label: String(d), sales: Math.round(sales(dayVisits)), ops: dayVisits.length });
    }

    setState({ loading: false, metrics, series });
  }, [userId, branchId]);

  useEffect(() => { run(); }, [run]);

  return state;
}

function fmt(n) { return Number(n || 0).toLocaleString('en'); }

// kind: 'moreGood' (higher is better) | 'lessGood' (lower is better)
function metric(label, value, change, kind) {
  const up = change > 0, down = change < 0, flat = change === 0;
  const good = kind === 'moreGood' ? up || flat : down || flat;
  const tone = flat ? 'neutral' : good ? 'good' : 'bad';
  const dir = flat ? 'flat' : up ? 'up' : 'down';
  const abs = Math.abs(change);
  let delta;
  if (flat) delta = 'بدون تغيّر عن الشهر الماضي';
  else if (kind === 'lessGood') delta = (down ? 'أسرع بـ ' : 'أبطأ بـ ') + abs + '% من الشهر الماضي';
  else delta = (up ? 'أعلى بـ ' : 'أقل بـ ') + abs + '% من الشهر الماضي';
  return { label, value, delta, tone, dir };
}
