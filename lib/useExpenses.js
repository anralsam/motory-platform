'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Operating expenses (OPEX) for the active branch.
 *
 * Reads through the ANON client, so RLS (`auth.uid() = merchant_id`) is the real
 * boundary — the explicit .eq('merchant_id') below is defence in depth, not the
 * gate. Branch semantics mirror the rest of the shell: 'all' shows every expense
 * including corporate overhead (branch_id IS NULL); a specific branch shows that
 * branch's expenses PLUS unallocated overhead, because rent/licences that belong
 * to the whole company still reduce that branch's real take-home.
 */
export const EXPENSE_CATEGORIES = [
  { key: 'salaries', label: 'رواتب', en: 'Salaries' },
  { key: 'rent', label: 'إيجار', en: 'Rent' },
  { key: 'utilities', label: 'خدمات ومرافق', en: 'Utilities' },
  { key: 'government_fees', label: 'رسوم حكومية', en: 'Government fees' },
  { key: 'inventory_purchase', label: 'شراء مخزون', en: 'Inventory purchase' },
  { key: 'miscellaneous', label: 'متنوّعة', en: 'Miscellaneous' },
];

export const categoryLabel = (key, isEn = false) => {
  const c = EXPENSE_CATEGORIES.find((x) => x.key === key);
  return c ? (isEn ? c.en : c.label) : (isEn ? 'Other' : 'أخرى');
};

export function useExpenses(merchantId, branchId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExpenses = useCallback(async () => {
    if (!merchantId) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
    setError('');

    let q = supabase
      .from('expenses')
      .select('id, merchant_id, branch_id, title, amount, category, expense_date, receipt_url, created_at')
      .eq('merchant_id', merchantId);

    // A specific branch also carries company-wide overhead (branch_id IS NULL).
    if (branchId && branchId !== 'all') q = q.or(`branch_id.eq.${branchId},branch_id.is.null`);

    const { data, error: err } = await q.order('expense_date', { ascending: false }).limit(500);

    if (err) { setError(err.message); setExpenses([]); }
    else {
      setExpenses((data || []).map((r) => ({
        ...r,
        amount: Number(r.amount) || 0,
      })));
    }
    setLoading(false);
  }, [merchantId, branchId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return { expenses, setExpenses, loading, error, refetch: fetchExpenses };
}
