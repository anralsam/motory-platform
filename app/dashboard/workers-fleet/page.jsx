'use client';

/**
 * /dashboard/workers-fleet — merchant Worker Fleet & Access Hub.
 * Owner-only: staff (technician/manager) have no business managing the fleet, so
 * the whole surface is walled behind the trusted role (resolved server-side and
 * delivered via AuthProvider — never user_metadata).
 */
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useBranchStore } from '@/store/branchStore';
import { useTeam } from '@/lib/useTeam';
import WorkersFleetManager from '@/components/WorkersFleetManager';

export default function WorkersFleetPage() {
  const { user, centerId, role } = useAuth();
  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const { members, setMembers, refetch, loading } = useTeam(centerId, selectedId);

  if (role !== 'owner') {
    return (
      <div className="mx-auto grid max-w-md place-items-center py-20 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">الوصول مرفوض</h1>
        <p className="mt-1 text-sm text-slate-500">إدارة أسطول العمال متاحة لمالك المركز فقط.</p>
        <Link href="/dashboard" className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <WorkersFleetManager
      centerId={centerId || user?.id}
      branches={branches}
      members={members}
      setMembers={setMembers}
      refetch={refetch}
      loading={loading}
    />
  );
}
