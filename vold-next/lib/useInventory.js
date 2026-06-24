'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

function mapRow(r) {
  return {
    id: r.id,
    name: r.name,
    cat: r.category,
    qty: r.quantity ?? 0,
    min: r.min_quantity ?? 0,
    price: Number(r.sell_price || 0),
    unit: r.unit || 'قطعة',
    supplier: r.supplier || '',
  };
}

/**
 * Loads inventory for the current owner, strictly scoped to the active branch.
 * Refetches automatically whenever `branchId` changes — no page reload.
 */
export function useInventory(userId, branchId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    let q = supabase.from('inventory').select('*').eq('merchant_id', userId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('category').order('name');
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setItems((data || []).map(mapRow));
    }
    setLoading(false);
  }, [userId, branchId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchItems();
    })();
    return () => {
      cancelled = true;
    };
    // fetchItems is memoized on [userId, branchId] → effect re-runs on branch switch.
  }, [fetchItems]);

  // Optimistic local-cache patch (e.g. after a stock movement) — no refetch needed.
  const patchItem = useCallback((id, partial) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...partial } : i)));
  }, []);

  return { items, loading, error, refetch: fetchItems, setItems, patchItem };
}
