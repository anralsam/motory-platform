'use client';

/**
 * /dashboard/expenses — the OPEX & net-profit surface.
 *
 * Least privilege: this is a financial route. A staff node whose
 * `can_view_financials` flag is OFF never sees the nav entry (components/nav.js
 * filters it) AND is stopped here by a hard Forbidden403 wall on direct URL
 * navigation. The database is the final boundary: the expenses RLS policy is
 * `auth.uid() = merchant_id`, so staff cannot read a single row even if the UI
 * were bypassed entirely.
 */
import { useAuth } from '@/components/AuthProvider';
import { useBranchStore } from '@/store/branchStore';
import { usePermissions } from '@/lib/usePermissions';
import { useDashboard } from '@/lib/useDashboard';
import { useExpenses } from '@/lib/useExpenses';
import Forbidden403 from '@/components/Forbidden403';
import ExpensePanel from '@/components/ExpensePanel';

export default function ExpensesPage() {
  const { user } = useAuth();
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const { canViewFinancials, loading: permLoading } = usePermissions();

  const { orders } = useDashboard(user?.id, selectedId);
  const { expenses, setExpenses, loading } = useExpenses(user?.id, selectedId);

  // Don't flash the wall while the permission row is still resolving.
  if (permLoading) return <div className="py-20 text-center text-sm text-slate-400">جاري التحميل…</div>;

  if (!canViewFinancials) {
    return (
      <Forbidden403
        title="صفحة مالية محظورة — 403"
        hint="سجل المصاريف والأرباح الصافية متاح لمن يملك صلاحية «عرض المالية». تواصل مع مالك المركز."
      />
    );
  }

  return (
    <ExpensePanel
      merchantId={user?.id}
      branchId={selectedId}
      branches={branches}
      orders={orders}
      expenses={expenses}
      setExpenses={setExpenses}
      loading={loading}
    />
  );
}
