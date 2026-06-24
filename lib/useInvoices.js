'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { invoiceTotals, COMMISSION_RATE } from '@/lib/billing';

const COLS = 'id,plate,car_make,car_model,customer_name,customer_phone,service_type,status,created_at,branch_id';

/**
 * Completed orders (invoices) for the active branch, newest first, plus the
 * current-month platform commission summary. Branch-reactive.
 */
export function useInvoices(centerId, branchId) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dues, setDues] = useState({ monthRevenue: 0, commission: 0, count: 0 });

  const fetchInvoices = useCallback(async () => {
    if (!centerId) { setInvoices([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('orders').select(COLS).eq('merchant_id', centerId).eq('status', 'completed');
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: false }).limit(300);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setInvoices([]); setLoading(false); return; }

    const rows = data || [];
    setInvoices(rows);

    // current-month commission
    const mStart = new Date(); mStart.setDate(1); mStart.setHours(0, 0, 0, 0);
    let monthRevenue = 0, count = 0;
    rows.forEach((o) => {
      if (new Date(o.created_at) >= mStart) { monthRevenue += invoiceTotals(o).total; count += 1; }
    });
    setDues({ monthRevenue: Math.round(monthRevenue), commission: Math.round(monthRevenue * COMMISSION_RATE * 100) / 100, count });
    setLoading(false);
  }, [centerId, branchId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return { invoices, loading, error, dues, refetch: fetchInvoices };
}
