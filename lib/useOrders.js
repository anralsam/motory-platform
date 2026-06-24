'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const COLS =
  'id,plate,car_make,car_model,customer_name,customer_phone,service_type,status,assigned_to,branch_id,created_at';

/**
 * Owner/manager view of recent orders for the active branch.
 * Refetches when branch changes.
 */
export function useRecentOrders(centerId, branchId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    if (!centerId) { setOrders([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('orders').select(COLS).eq('merchant_id', centerId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: false }).limit(50);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setOrders([]); }
    else setOrders(data || []);
    setLoading(false);
  }, [centerId, branchId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
}

/** Fetch active technicians of a branch (for the assignment dropdown). */
export async function fetchTechnicians(centerId, branchId) {
  if (!centerId) return [];
  let q = supabase
    .from('workers')
    .select('user_id,full_name,phone,role,status,branch_id')
    .eq('center_id', centerId)
    .eq('role', 'technician');
  if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
  const { data } = await q;
  return (data || []).filter((w) => w.user_id && w.status !== 'inactive');
}
