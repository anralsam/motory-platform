'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const COLS = 'id,full_name,phone,car_make,car_model,car_plate,total_visits,branch_id,created_at';

/**
 * Customers for the active branch (owner-scoped via RLS).
 * Refetches when branch changes.
 */
export function useCustomers(centerId, branchId) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCustomers = useCallback(async () => {
    if (!centerId) { setCustomers([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('customers').select(COLS).eq('merchant_id', centerId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('total_visits', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setCustomers([]); }
    else setCustomers(data || []);
    setLoading(false);
  }, [centerId, branchId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  return { customers, loading, error, refetch: fetchCustomers };
}
