'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Explicit operational column list — NO price/total/commission fields (RBAC: workers
// never see financial data). The orders table has no money columns anyway.
const COLS =
  'id,plate,car_make,car_model,customer_name,service_type,status,created_at,started_at,ready_at,completed_at,assigned_to,branch_id';

/**
 * Loads the technician's assigned orders, scoped to their branch.
 * Returns optimistic helpers (patch) for instant UI updates.
 */
export function useTasks(centerId, branchId, myUid) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!centerId || !myUid) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('orders').select(COLS).eq('merchant_id', centerId).eq('assigned_to', myUid);
    if (branchId) q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: true });
    const { data, error: err } = await q;
    if (err) { setError(err.message); setTasks([]); }
    else setTasks(data || []);
    setLoading(false);
  }, [centerId, branchId, myUid]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const patch = useCallback((id, partial) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  }, []);

  return { tasks, loading, error, refetch: fetchTasks, setTasks, patch };
}
