'use client';

/**
 * AssignControl — merchant assigns an unassigned order to one of THEIR workers.
 * The worker list is passed from the server (already scoped to the merchant's
 * center). Calls the assignOrderToWorker Server Action, which re-verifies on the
 * server that the order belongs to the caller and the worker belongs to the center.
 */
import { useState } from 'react';
import { assignOrderToWorker } from '@/app/dashboard-pro/actions';

export default function AssignControl({ orderId, workers = [], onAssigned }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!workers.length) {
    return <span className="text-xs text-slate-400">لا يوجد فنّيون في مركزك</span>;
  }

  async function assign(workerUserId) {
    if (!workerUserId) return;
    setBusy(true);
    setMsg(null);
    const res = await assignOrderToWorker(orderId, workerUserId);
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, name: workers.find((w) => w.user_id === workerUserId)?.full_name || 'الفنّي' });
      onAssigned?.(orderId, workerUserId);
    } else {
      setMsg({ ok: false, text: res?.error || 'تعذّر التكليف' });
      setValue('');
    }
  }

  if (msg?.ok) {
    return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">✓ كُلّف إلى {msg.name}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={busy}
        onChange={(e) => { setValue(e.target.value); assign(e.target.value); }}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 disabled:opacity-50"
      >
        <option value="">{busy ? 'جارٍ التكليف…' : 'تكليف فنّي…'}</option>
        {workers.map((w) => (
          <option key={w.user_id} value={w.user_id}>{w.full_name || 'فنّي'}</option>
        ))}
      </select>
      {msg && !msg.ok ? <span className="text-xs font-semibold text-rose-600">{msg.text}</span> : null}
    </div>
  );
}
