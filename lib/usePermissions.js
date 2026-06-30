'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { supabase } from '@/lib/supabaseClient';

/**
 * Resolves the CURRENT user's granular permissions.
 * Owners always have full access; staff (workers) inherit their row's keys.
 * Use ONLY inside the legacy /dashboard shell (it provides AuthProvider) — never
 * inside the shared DNA components, which run under the separate dashboard-pro shell.
 */
export function usePermissions() {
  const { user } = useAuth();
  const isOwner = roleOf(user?.user_metadata?.role) === 'owner';
  const [perms, setPerms] = useState(null);

  useEffect(() => {
    if (isOwner || !user?.id) { setPerms(null); return undefined; }
    let alive = true;
    supabase.from('workers')
      .select('can_view_financials, can_manage_catalog, can_transfer_staff')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (alive) setPerms(data || {}); });
    return () => { alive = false; };
  }, [isOwner, user?.id]);

  return {
    isOwner,
    loading: !isOwner && perms === null,
    canViewFinancials: isOwner || !!perms?.can_view_financials,
    canManageCatalog: isOwner || !!perms?.can_manage_catalog,
    canTransferStaff: isOwner || !!perms?.can_transfer_staff,
  };
}
