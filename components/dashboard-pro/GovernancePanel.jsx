/**
 * GovernancePanel — admin governance view: platform access control = merchant
 * join-request approvals. Wraps the AcceptanceTable data-grid.
 */
import { ShieldCheck } from 'lucide-react';
import AcceptanceTable from './AcceptanceTable';

export default function GovernancePanel({ rows = [], pending = 0 }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <ShieldCheck size={16} className="text-blue-600" /> اعتماد المراكز · {pending} بانتظار المراجعة
      </div>
      <AcceptanceTable initialRows={rows} />
    </div>
  );
}
