'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Loads staff for the current owner, scoped to the active branch.
 * Refetches automatically when branchId changes.
 */
export function useTeam(userId, branchId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTeam = useCallback(async () => {
    if (!userId) { setMembers([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    let q = supabase.from('workers').select('*').eq('center_id', userId);
    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId);
    q = q.order('created_at', { ascending: false });
    const { data, error: err } = await q;
    if (err) { setError(err.message); setMembers([]); }
    else setMembers(data || []);
    setLoading(false);
  }, [userId, branchId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  return { members, loading, error, refetch: fetchTeam, setMembers };
}
