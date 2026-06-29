'use client';

/**
 * AdminDashboard — the main Admin Command Center view (System Token).
 *   • 4 metric cards (royal-blue accents).
 *   • Revenue line chart (recharts, clean blue line, no gradient).
 *   • High-density shop-approvals data table (AcceptanceTable) with optimistic
 *     Approve/Reject/Suspend/Unlock.
 * Receives serializable data from the server orchestrator (page.jsx).
 */
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Wallet, Activity, Store, ShieldCheck } from 'lucide-react';
import StatTile from './StatTile';
import AcceptanceTable from './AcceptanceTable';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

export default function AdminDashboard({ metrics = {}, revenue = [], approvals = [] }) {
  const m = metrics;
  return (
    <div className="space-y-6">
      {/* 4 metric cards — royal-blue accents */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} tone="blue" label="إجمالي الإيراد" value={sar(m.revenue)} sub="من الطلبات المكتملة" />
        <StatTile icon={Activity} tone="blue" label="طلبات قيد التنفيذ" value={(m.active || 0).toLocaleString('en-US')} sub="نشطة الآن" />
        <StatTile icon={Store} tone="blue" label="الورش النشطة" value={(m.workshops || 0).toLocaleString('en-US')} sub="مركز مفعّل" />
        <StatTile icon={ShieldCheck} tone="blue" label="بانتظار الاعتماد" value={(m.pending || 0).toLocaleString('en-US')} sub="طلب انضمام" />
      </div>

      {/* Revenue line chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 text-sm font-semibold text-slate-900">الإيراد عبر الزمن</div>
        <div className="mb-4 text-xs font-normal text-slate-400">إيراد الطلبات المكتملة شهرياً</div>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} minTickGap={20} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: 'none' }} formatter={(v) => [sar(v), 'الإيراد']} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shop approvals — high-density data table */}
      <div>
        <div className="mb-3 text-sm font-semibold text-slate-900">اعتماد المراكز</div>
        <AcceptanceTable initialRows={approvals} />
      </div>
    </div>
  );
}
