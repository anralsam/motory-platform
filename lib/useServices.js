'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** Owner-managed service/price menu for the active branch. */
export function useServices(centerId, branchId) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchServices = useCallback(async () => {
    if (!centerId) { setServices([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('service_menu').select('*').eq('merchant_id', centerId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: true });
    const { data, error: err } = await q;
    if (err) { setError(err.message); setServices([]); }
    else setServices(data || []);
    setLoading(false);
  }, [centerId, branchId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
}

/** Lightweight fetch of active services for the POS dropdown. */
export async function fetchServiceMenu(centerId, branchId) {
  if (!centerId) return [];
  let q = supabase.from('service_menu').select('id,name,price,category').eq('merchant_id', centerId).eq('active', true);
  if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
  const { data } = await q.order('created_at', { ascending: true });
  return data || [];
}
