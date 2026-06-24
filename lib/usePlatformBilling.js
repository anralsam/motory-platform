'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** The owner's platform-commission billing record for the current month (RLS: own only). */
export function usePlatformBilling(centerId) {
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchBilling = useCallback(async () => {
    if (!centerId) { setBilling(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('platform_billing')
      .select('*')
      .eq('merchant_id', centerId)
      .eq('billing_period', period)
      .maybeSingle();
    setBilling(data || null);
    setLoading(false);
  }, [centerId, period]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  return { billing, loading, refetch: fetchBilling };
}
