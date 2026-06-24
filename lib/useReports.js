'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Completed operations / invoices for the active branch.
 * Sourced from `visits` (the revenue ledger — carries price/discount), branch-scoped.
 * Refetches automatically whenever `branchId` changes.
 */
export function useCompletedOps(userId, branchId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    let q = supabase
      .from('visits')
      .select('id,created_at,customer_name,plate,service_type,price,discount,visit_number')
      .eq('merchant_id', userId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: false }).limit(100);

    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows(
        (data || []).map((r) => ({
          id: r.id,
          ref: r.visit_number || (r.id ? String(r.id).slice(0, 8) : '—'),
          date: r.created_at,
          customer: r.customer_name || r.plate || '—',
          service: r.service_type || '—',
          total: Number(r.price || 0) - Number(r.discount || 0),
        }))
      );
    }
    setLoading(false);
  }, [userId, branchId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { rows, loading, error, refetch: fetchRows };
}
