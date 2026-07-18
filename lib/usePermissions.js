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
  // SECURITY: derive ownership from app_metadata ONLY. user_metadata is
  // client-writable, so reading the role from it let any technician set
  // role='owner' and unlock the financial + catalog + staff-transfer views.
  // app_metadata is service-role-only (set by the create-worker function) and
  // is signed into the JWT. Staff always carry app_metadata.center_id; a real
  // owner carries none, so the absence of center_id is the ownership signal.
  const appMeta = user?.app_metadata || {};
  const isOwner = !appMeta.center_id && roleOf(appMeta.role) === 'owner';
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
