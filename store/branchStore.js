'use client';
import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

/**
 * Global branch state, shared across the whole app.
 * `selectedBranchId` is either the string 'all' or a branch id.
 *
 * The URL (`?branch=<id>`) is the SOURCE OF TRUTH — BranchUrlSync mirrors it into
 * this store and back. That is why the store is deliberately NOT persisted:
 * persisting the selection made every tab read the same localStorage key, so two
 * tabs open on two branches fought over one value. With the branch in the URL each
 * tab is independent and a branch view can be linked, bookmarked and shared.
 */
export const useBranchStore = create((set, get) => ({
  branches: [],
  selectedBranchId: 'all',
  loading: false,

  setSelectedBranch(id) {
    set({ selectedBranchId: id });
    // one-way mirror for the legacy vanilla pages (never read back on init)
    try {
      localStorage.setItem('vm_active_branch', id);
      window.dispatchEvent(new CustomEvent('vm:branch-change', { detail: { branch: id } }));
    } catch (e) {}
  },

  async loadBranches() {
    set({ loading: true });
    try {
      // my_branches() is SECURITY DEFINER and returns ONLY the caller's branches,
      // so this doubles as the ownership check for a branch id taken from the URL.
      const { data } = await supabase.rpc('my_branches');
      const branches = Array.isArray(data) ? data : [];
      const cur = get().selectedBranchId;
      const valid = cur === 'all' || branches.some((b) => b.id === cur);
      set({ branches, selectedBranchId: valid ? cur : 'all', loading: false });
    } catch (e) {
      set({ branches: [], loading: false });
    }
  },
}));

/** Helper selector used by layout/header. */
export function useSelectedBranch() {
  const id = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  if (id === 'all') return { id: 'all', name: 'كل الفروع', center_type: null, logo_url: null };
  return branches.find((b) => b.id === id) || { id: 'all', name: 'كل الفروع', center_type: null, logo_url: null };
}
