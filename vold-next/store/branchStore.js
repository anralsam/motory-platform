'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabaseClient';

/**
 * Global branch state, shared across the whole app.
 * `selectedBranch` is either the string 'all' or a branch object { id, name, center_type, logo_url }.
 * Mirrors the vanilla app's localStorage('vm_active_branch') contract so both stacks stay in sync.
 */
export const useBranchStore = create(
  persist(
    (set, get) => ({
      branches: [],
      selectedBranchId: 'all',
      loading: false,

      setSelectedBranch(id) {
        set({ selectedBranchId: id });
        // keep the legacy vanilla pages in sync
        try {
          localStorage.setItem('vm_active_branch', id);
          window.dispatchEvent(new CustomEvent('vm:branch-change', { detail: { branch: id } }));
        } catch (e) {}
      },

      async loadBranches() {
        set({ loading: true });
        try {
          const { data } = await supabase.rpc('my_branches');
          const branches = Array.isArray(data) ? data : [];
          // reset invalid selection
          const cur = get().selectedBranchId;
          const valid = cur === 'all' || branches.some((b) => b.id === cur);
          set({ branches, selectedBranchId: valid ? cur : 'all', loading: false });
        } catch (e) {
          set({ branches: [], loading: false });
        }
      },
    }),
    {
      name: 'vm-branch-store',
      partialize: (s) => ({ selectedBranchId: s.selectedBranchId }),
    }
  )
);

/** Helper selector used by layout/header. */
export function useSelectedBranch() {
  const id = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  if (id === 'all') return { id: 'all', name: 'كل الفروع', center_type: null, logo_url: null };
  return branches.find((b) => b.id === id) || { id: 'all', name: 'كل الفروع', center_type: null, logo_url: null };
}
