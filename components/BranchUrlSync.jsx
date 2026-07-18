'use client';

/**
 * BranchUrlSync — keeps `?branch=<id>` and the branch store in lockstep.
 *
 * Why: the active branch used to live only in zustand + localStorage, so a branch
 * view could not be linked, bookmarked or opened in a second tab (both tabs shared
 * one localStorage key and overwrote each other). Putting the branch in the URL
 * gives every branch its own address and makes tabs independent.
 *
 * Direction 1 — URL → store: on load and on every navigation, adopt `?branch=`.
 *   A branch id that is not in `my_branches()` (another tenant's, or a stale link)
 *   is ignored; loadBranches() then resets the selection to 'all'.
 * Direction 2 — store → URL: switching branches rewrites the query string with
 *   router.replace (not push) so the back button isn't flooded with branch toggles.
 *
 * Mounted once in the dashboard shell; renders nothing.
 */
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useBranchStore } from '@/store/branchStore';

export default function BranchUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlBranch = params.get('branch') || 'all';

  const selected = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const setSelectedBranch = useBranchStore((s) => s.setSelectedBranch);

  // ── URL → store ──
  useEffect(() => {
    if (urlBranch === selected) return;
    // Only adopt a branch the user actually owns. Before branches load we accept it
    // optimistically; loadBranches() validates and falls back to 'all' if foreign.
    if (urlBranch !== 'all' && branches.length && !branches.some((b) => b.id === urlBranch)) return;
    setSelectedBranch(urlBranch);
  }, [urlBranch, branches, selected, setSelectedBranch]);

  // ── store → URL ──
  useEffect(() => {
    if (urlBranch === selected) return;
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (selected === 'all') sp.delete('branch');
    else sp.set('branch', selected);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
