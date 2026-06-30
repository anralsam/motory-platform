'use client';

/**
 * DashboardContainer — the mother-shell of the Grand Unified DNA.
 * Provides TWO contexts to every surface that lives inside it:
 *   • DataContext   — the global filter brain (range + metric) + every derived
 *                     dataset (series / kpis / statusDist / topServices), recomputed
 *                     by the pure engine whenever the filter or the orders change.
 *   • ActionsContext — centralized OPTIMISTIC mutators (status / assign / deduct /
 *                      start) for the sub-100ms feel; each reverts on server failure.
 * Renders the role-aware GlobalControlBar at the top, then the consuming children.
 * Role-agnostic shell, role-aware control bar.
 */
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { computeDerived } from './engine';
import { useBranchStore } from '@/store/branchStore';
import GlobalControlBar from './GlobalControlBar';

const DataCtx = createContext(null);
const ActionsCtx = createContext(null);
export const useDashboardData = () => useContext(DataCtx);
export const useActions = () => useContext(ActionsCtx);

export default function DashboardContainer({ role = 'merchant', orders = [], workers = [], inventory = [], actions = {}, headerActions = null, permissions = { canTransfer: true }, children }) {
  // The UnifiedChart matrix is the master controller: it owns metric + timeline,
  // and the whole dashboard (cards/tables) re-derives from this single state.
  const [metric, setMetric] = useState('revenue');
  const [timeline, setTimeline] = useState('week');
  const [ordersState, setOrders] = useState(orders);
  const [invState, setInv] = useState(inventory);

  const [workersState, setWorkers] = useState(workers);

  // Global branch state (shared zustand brain) → mirrored into this context so the
  // header switcher and every consumer agree. Branch filtering is 100% client-side.
  const currentBranchId = useBranchStore((s) => s.selectedBranchId);
  const setCurrentBranchId = useBranchStore((s) => s.setSelectedBranch);
  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  useEffect(() => { loadBranches(); }, [loadBranches]);

  // Keep local state in sync with the pre-fetched matrix as it arrives/refreshes.
  useEffect(() => { setOrders(orders); }, [orders]);
  useEffect(() => { setInv(inventory); }, [inventory]);
  useEffect(() => { setWorkers(workers); }, [workers]);

  // Instant, zero-latency branch slices over the in-memory matrices (no refetch).
  const branchOrders = useMemo(
    () => (currentBranchId && currentBranchId !== 'all' ? ordersState.filter((o) => o.branch_id === currentBranchId) : ordersState),
    [ordersState, currentBranchId],
  );
  const branchWorkers = useMemo(
    () => (currentBranchId && currentBranchId !== 'all' ? workersState.filter((w) => w.branch_id === currentBranchId) : workersState),
    [workersState, currentBranchId],
  );

  const derived = useMemo(() => computeDerived(branchOrders, branchWorkers, timeline), [branchOrders, branchWorkers, timeline]);

  // ── Centralized optimistic mutators ──
  const updateStatus = useCallback(async (id, status) => {
    const prev = ordersState;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
    const r = await actions.updateOrderStatus?.(id, status);
    if (!r?.ok) setOrders(prev);
    return r;
  }, [ordersState, actions]);

  const assign = useCallback(async (id, userId) => {
    const prev = ordersState;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, assigned_to: userId } : x)));
    const r = await actions.assignOrderToWorker?.(id, userId);
    if (!r?.ok) setOrders(prev);
    return r;
  }, [ordersState, actions]);

  const deduct = useCallback(async (orderId, parts) => {
    const prev = invState;
    setInv((v) => v.map((i) => { const p = parts.find((q) => q.itemId === i.id); return p ? { ...i, quantity: Math.max(0, (i.quantity || 0) - Number(p.qty)) } : i; }));
    const r = await actions.deductParts?.(orderId, parts);
    if (!r?.ok) setInv(prev);
    return r;
  }, [invState, actions]);

  const start = useCallback(async (id, payload) => {
    const prev = ordersState;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status: 'in_progress', plate: payload?.plate ?? x.plate, service_type: payload?.serviceType ?? x.service_type } : x)));
    const r = await actions.startOrderWithParts?.(id, payload);
    if (!r?.ok) setOrders(prev);
    return r;
  }, [ordersState, actions]);

  // Local-only patch (server write already happened elsewhere, e.g. a modal).
  const patchOrder = useCallback((id, patch) => setOrders((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x))), []);

  // Optimistic technician branch transfer — sub-100ms; reverts on server failure.
  const transferWorker = useCallback(async (userId, branchId) => {
    const prev = workersState;
    setWorkers((ws) => ws.map((w) => (w.user_id === userId ? { ...w, branch_id: branchId } : w)));
    const r = await actions.transferWorkerBranch?.(userId, branchId);
    if (!r?.ok) setWorkers(prev);
    return r;
  }, [workersState, actions]);

  const dataValue = useMemo(
    () => ({ role, metric, setMetric, timeline, setTimeline, orders: branchOrders, workers: branchWorkers, currentBranchId, setCurrentBranchId, branches, permissions, ...derived }),
    [role, metric, timeline, branchOrders, branchWorkers, currentBranchId, setCurrentBranchId, branches, permissions, derived],
  );
  const actionsValue = useMemo(() => ({ role, orders: ordersState, inventory: invState, workers: workersState, updateStatus, assign, deduct, start, patchOrder, transferWorker }), [role, ordersState, invState, workersState, updateStatus, assign, deduct, start, patchOrder, transferWorker]);

  return (
    <ActionsCtx.Provider value={actionsValue}>
      <DataCtx.Provider value={dataValue}>
        <div className="space-y-6">
          {/* Administrative layout strip — only renders for role-specific actions. */}
          {headerActions ? <GlobalControlBar headerActions={headerActions} /> : null}
          {children}
        </div>
      </DataCtx.Provider>
    </ActionsCtx.Provider>
  );
}
