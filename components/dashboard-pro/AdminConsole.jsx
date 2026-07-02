'use client';

/**
 * AdminConsole — VOLD MOTOR Super-Admin command center (YouTube-Studio parity).
 * Light shell, ONE flat concise sidebar (no groups, no page bloat):
 *   لوحة البيانات · المراكز لايف · طلبات الانضمام · المالية · الحوكمة · الإعدادات
 * Finance and Governance fold their former standalone pages into internal
 * sub-tabs — nothing is lost, the nav just stops shouting. Header carries the
 * page title + the live indicator only (the "العودة للموقع" escape hatch is
 * intentionally gone: the console IS the destination). Brand: the same
 * /logo.png wordmark as the public landing. Metric cards are Studio-style —
 * label / big tabular number / growth arrow — with NO icon chips.
 */
import { useMemo, useState } from 'react';
import {
  LayoutDashboard, RadioTower, Inbox, Wallet, ShieldCheck, Settings,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { toggleMerchantFreeze } from '@/app/dashboard-pro/actions';
import DashboardContainer, { useDashboardData } from './dna/DashboardContainer';
import { computeComparisons } from './dna/engine';
import UnifiedChart from './dna/UnifiedChart';
import CentersLive from './CentersLive';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;
const sar = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} \u20C1`;

// ── Flat, concise nav — الترتيب المعتمد: الرئيسية ← طلبات الانضمام ← المالية
//    ← المتابعة الحية ← الحوكمة ← الإعدادات (آخر شيء دائماً). ثنائي اللغة. ──
const PAGES = [
  { k: 'dashboard', label: 'الرئيسية', en: 'Home', Icon: LayoutDashboard },
  { k: 'requests', label: 'طلبات الانضمام', en: 'Join Requests', Icon: Inbox },
  { k: 'finance', label: 'المالية', en: 'Finance', Icon: Wallet },
  { k: 'live', label: 'المتابعة الحية', en: 'Live Monitor', Icon: RadioTower },
  { k: 'governance', label: 'الحوكمة والأمان', en: 'Governance', Icon: ShieldCheck },
  { k: 'settings', label: 'الإعدادات', en: 'Settings', Icon: Settings },
];

// surfaces
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const MUTED = 'text-slate-500';

function Pill({ tone = 'gray', children }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-rose-50 text-rose-600', gray: 'bg-slate-100 text-slate-500',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

/* ── Studio-style stat card: label / big number / growth. NO icon chips. ── */
function StatCard({ label, value, delta, deltaTone = 'up', hint }) {
  return (
    <div className={`${CARD} p-5`}>
      <div className={`text-xs font-medium ${MUTED}`}>{label}</div>
      <div className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{value}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        {delta != null && (deltaTone === 'up'
          ? <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600"><ArrowUpRight size={13} /><span dir="ltr">{delta}</span></span>
          : <span className="inline-flex items-center gap-0.5 font-semibold text-rose-600"><ArrowDownRight size={13} /><span dir="ltr">{delta}</span></span>)}
        {hint && <span className="font-medium text-slate-400">{hint}</span>}
      </div>
    </div>
  );
}

/* ── Internal sub-tab strip (folds former standalone pages) ── */
function SubTabs({ tabs, value, onChange }) {
  return (
    <div className="flex items-center gap-6 border-b border-slate-200">
      {tabs.map(([k, label]) => {
        const on = value === k;
        return (
          <button key={k} onClick={() => onChange(k)} className="relative -mb-px pb-3 pt-1">
            <span className={`text-sm transition-colors ${on ? 'font-bold text-slate-900' : 'font-medium text-slate-500 hover:text-slate-800'}`}>{label}</span>
            {on && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-slate-900" />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Join requests with real accept/reject ── */
function RequestsView({ initial, flash }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(null);
  const pending = rows.filter((r) => r.status === 'pending');
  async function act(id, action) {
    setBusy(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(EDGE, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ action, id }) });
      if (!res.ok) throw new Error('خطأ');
      setRows((p) => p.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r)));
      flash(action === 'approve' ? 'تم القبول' : 'تم الرفض');
    } catch { flash('تعذّر التنفيذ'); } finally { setBusy(null); }
  }
  if (!pending.length) return <Empty label="لا توجد طلبات بانتظار التدقيق" />;
  return (
    <div className={`${CARD} divide-y divide-slate-200 overflow-hidden`}>
      {pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{r.shop_name || '—'}</div>
            <div className={`truncate text-xs ${MUTED}`}>{r.owner_name}{r.location ? ` · ${r.location}` : ''}</div>
          </div>
          <button disabled={busy === r.id} onClick={() => act(r.id, 'approve')} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">قبول</button>
          <button disabled={busy === r.id} onClick={() => act(r.id, 'reject')} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">رفض</button>
        </div>
      ))}
    </div>
  );
}

function AuditView() {
  const logs = [
    { t: '14:32', ip: '212.118.4.21', op: 'اعتماد مركز «رائد»', who: 'admin@voldmotor.com' },
    { t: '13:05', ip: '94.56.10.7', op: 'فكّ قفل حساب', who: 'admin@voldmotor.com' },
    { t: '11:48', ip: '188.55.2.90', op: 'تعديل عمولة الباقة', who: 'ops@voldmotor.com' },
    { t: '09:20', ip: '212.118.4.21', op: 'رفض طلب انضمام', who: 'admin@voldmotor.com' },
  ];
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="grid grid-cols-[auto_1fr_1.4fr_1fr] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>الوقت</span><span>IP</span><span>العملية</span><span>المنفّذ</span>
      </div>
      <div className="divide-y divide-slate-200">
        {logs.map((l, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1.4fr_1fr] gap-4 px-5 py-3 text-sm hover:bg-slate-100">
            <span className="tabular-nums text-slate-500" dir="ltr">{l.t}</span>
            <span className="font-inter tabular-nums text-slate-500" dir="ltr">{l.ip}</span>
            <span className="text-slate-900">{l.op}</span>
            <span className="truncate text-slate-500" dir="ltr">{l.who}</span>
          </div>
        ))}
      </div>
      <MockNote />
    </div>
  );
}

function RbacView() {
  const admins = [['مدير المنصة', 'admin@voldmotor.com', 'Owner', 'green'], ['فريق العمليات', 'ops@voldmotor.com', 'Operations', 'blue'], ['المالية', 'finance@voldmotor.com', 'Finance', 'amber']];
  return (
    <div className={`${CARD} divide-y divide-slate-200 overflow-hidden`}>
      {admins.map(([name, email, role, tone], i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-900">{name}</div><div className={`text-xs ${MUTED}`} dir="ltr">{email}</div></div>
          <Pill tone={tone}>{role}</Pill>
        </div>
      ))}
      <MockNote />
    </div>
  );
}

function ListView({ rows, cols }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="grid gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500" style={{ gridTemplateColumns: cols.map(() => '1fr').join(' ') }}>
        {cols.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div className="divide-y divide-slate-200">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-4 px-5 py-3 text-sm hover:bg-slate-100" style={{ gridTemplateColumns: cols.map(() => '1fr').join(' ') }}>
            {r.map((cell, j) => <span key={j} className={j === 0 ? 'font-semibold text-slate-900' : MUTED} dir={j > 0 ? 'ltr' : 'rtl'}>{cell}</span>)}
          </div>
        ))}
      </div>
      <MockNote />
    </div>
  );
}

function MockNote() {
  return <div className="border-t border-slate-200 px-5 py-2 text-[11px] text-slate-400">عرض تجريبي — يُربط بجدول حقيقي عند تجهيز الوحدة.</div>;
}
/* ── نسبة عمولة المنصة الرسمية — 0.4% لكل عملية ── */
const COMMISSION_RATE = 0.004;
const RATE_LABEL = '0.4%';

/* ── الإعدادات = إدارة المراكز وحظرها فقط ── */
function CentersControl({ rows = [], onManage }) {
  const [q, setQ] = useState('');
  const filtered = rows.filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold text-slate-900">إدارة المراكز والحظر</div>
          <div className="mt-0.5 text-xs font-medium text-slate-400">تجميد المراكز، وضعها تحت التدقيق، أو ترقية باقتها — التغييرات فورية</div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المركز…"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium outline-none transition focus:border-slate-900 sm:w-64" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {filtered.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{r.name}</span>
                  {r.is_frozen && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">محظور/مجمّد</span>}
                  {r.under_audit && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">تحت التدقيق</span>}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-400">{r.branches} فرع · {r.orders?.toLocaleString?.('en-US') || r.orders || 0} عملية</div>
              </div>
              <button onClick={() => onManage?.(r.id)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                إدارة الحساب
              </button>
            </div>
          ))}
          {!filtered.length && <div className="grid place-items-center py-14 text-sm text-slate-400">لا نتائج مطابقة</div>}
        </div>
      </div>
    </div>
  );
}

/* ── شريط أرقام موحّد: بطاقة واحدة مقسّمة — يدعم مؤشر مقارنة أخضر/أحمر ── */
function StatStrip({ items = [] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-3 xl:grid-cols-5">
      {items.map(([l, v, growth]) => (
        <div key={l} className="bg-white px-4 py-4 sm:px-5">
          <div className="text-[11px] font-semibold text-slate-400">{l}</div>
          <div className="mt-1.5 truncate text-xl font-bold tabular-nums text-slate-900 sm:text-2xl" dir="ltr">{v}</div>
          {growth !== undefined && growth !== null && (
            <div className={`mt-1 inline-flex items-center gap-0.5 text-[11px] font-bold ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
              {growth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(growth)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* شريط الرئيسية التفاعلي — يقرأ فلتر الفترة من سياق الرسم ويقارن بالفترة السابقة */
function AdminHomeStrip({ macro = {}, sarFn }) {
  const { orders = [], timeline = 'week' } = useDashboardData() || {};
  const comp = useMemo(() => computeComparisons(orders, timeline), [orders, timeline]);
  const g = (k) => (comp.allTime ? null : comp[k]?.growth ?? null);
  return (
    <StatStrip items={[
      ['المراكز النشطة', (macro.activeCenters || 0).toLocaleString('en-US')],
      ['إجمالي الفروع', (macro.branches || 0).toLocaleString('en-US')],
      ['العمليات (حسب الفترة)', (comp.sales?.value || 0).toLocaleString('en-US'), g('sales')],
      ['الإيرادات (حسب الفترة)', sarFn(comp.revenue?.value || 0), g('revenue')],
      ['عمولات المنصة (حسب الفترة)', sarFn((comp.revenue?.value || 0) * COMMISSION_RATE), g('revenue')],
    ]} />
  );
}

function Empty({ label }) {
  return <div className={`${CARD} grid place-items-center py-16 text-sm ${MUTED}`}>{label}</div>;
}

/* ── Finance page: العمولات · التسويات الشهرية المفصلة (لا اشتراكات) ── */
const MONTH_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function FinanceView({ metrics, orders = [], centers = [] }) {
  const [tab, setTab] = useState('commissions');
  return (
    <div className="space-y-6">
      <SubTabs value={tab} onChange={setTab} tabs={[['commissions', 'الأرباح والعمولات'], ['settlements', 'التسويات والتحويلات']]} />
      {tab === 'commissions' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard label="صافي العمولات" value={sar(metrics.commissions)} hint={`نسبة المنصة ${RATE_LABEL} على كل عملية`} />
          <StatCard label="حجم المعاملات" value={sar(metrics.gmv)} hint="إجمالي قيمة العمليات المكتملة" />
          <StatCard label="نسبة العمولة" value={RATE_LABEL} hint="لكل عملية مكتملة" />
        </div>
      )}
      {tab === 'settlements' && <MonthlySettlements orders={orders} centers={centers} />}
    </div>
  );
}

/* التسويات والتحويلات — مقسّمة شهرياً ومفصّلة لكل مركز */
function MonthlySettlements({ orders = [], centers = [] }) {
  const nameOf = useMemo(() => Object.fromEntries(centers.map((c) => [c.id, c.name])), [centers]);
  const months = useMemo(() => {
    const g = {};
    orders.forEach((o) => {
      if (o.status !== 'completed') return;
      const t = o.completed_at || o.created_at;
      if (!t) return;
      const d = new Date(t);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const m = g[key] || (g[key] = { y: d.getFullYear(), m: d.getMonth(), gmv: 0, ops: 0, byCenter: {} });
      const price = Number(o.price) || 0;
      m.gmv += price; m.ops += 1;
      const c = m.byCenter[o.merchant_id] || (m.byCenter[o.merchant_id] = { gmv: 0, ops: 0 });
      c.gmv += price; c.ops += 1;
    });
    return Object.entries(g).map(([key, m]) => ({ key, ...m }))
      .sort((a, b) => (b.y - a.y) || (b.m - a.m));
  }, [orders]);
  const [openKey, setOpenKey] = useState(null);
  const now = new Date();

  if (!months.length) return <Empty label="لا توجد تسويات بعد — تظهر تلقائياً مع أول عملية مكتملة" />;

  return (
    <div className="space-y-4">
      {months.map((m) => {
        const commission = m.gmv * COMMISSION_RATE;
        const isCurrent = m.y === now.getFullYear() && m.m === now.getMonth();
        const open = openKey === m.key;
        const rows = Object.entries(m.byCenter)
          .map(([id, c]) => ({ id, name: nameOf[id] || 'مركز', ...c }))
          .sort((a, b) => b.gmv - a.gmv);
        return (
          <div key={m.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button onClick={() => setOpenKey(open ? null : m.key)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-start transition hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-900">{MONTH_AR[m.m]} {m.y}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isCurrent ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isCurrent ? 'الشهر الجاري — تُسوَّى نهايته' : 'مستحقة التحويل'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span className="font-semibold text-slate-400">{m.ops.toLocaleString('en-US')} عملية</span>
                <span className="font-semibold text-slate-500">إجمالي <b className="tabular-nums text-slate-900" dir="ltr">{sar(m.gmv)}</b></span>
                <span className="font-semibold text-slate-500">عمولة المنصة <b className="tabular-nums text-blue-600" dir="ltr">{sar(commission)}</b></span>
                <svg className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </button>
            {open && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500">
                      <th className="px-5 py-2.5 text-start">المركز</th>
                      <th className="px-5 py-2.5 text-start">العمليات</th>
                      <th className="px-5 py-2.5 text-start">الإجمالي</th>
                      <th className="px-5 py-2.5 text-start">عمولة {RATE_LABEL}</th>
                      <th className="px-5 py-2.5 text-start">صافي المركز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-5 py-3 font-bold text-slate-900">{r.name}</td>
                        <td className="px-5 py-3 tabular-nums text-slate-600" dir="ltr">{r.ops}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-slate-900" dir="ltr">{sar(r.gmv)}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-blue-600" dir="ltr">{sar(r.gmv * COMMISSION_RATE)}</td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-emerald-600" dir="ltr">{sar(r.gmv * (1 - COMMISSION_RATE))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Governance page: سجل الحركات · الصلاحيات · النزاعات (folded sub-tabs) ── */
function GovernanceView() {
  const [tab, setTab] = useState('audit');
  return (
    <div className="space-y-6">
      <SubTabs value={tab} onChange={setTab} tabs={[['audit', 'سجل حركات الموظفين'], ['rbac', 'صلاحيات المشرفين'], ['disputes', 'النزاعات والشكاوى']]} />
      {tab === 'audit' && <AuditView />}
      {tab === 'rbac' && <RbacView />}
      {tab === 'disputes' && <ListView cols={['الشكوى', 'المركز', 'الحالة']} rows={[['تأخر تسليم سيارة', 'مركز رائد', 'مفتوحة'], ['نزاع على فاتورة', 'ورشة الخليج', 'قيد المراجعة']]} />}
    </div>
  );
}

function ManageSheet({ row, onFreeze, onClose }) {
  if (!row) return null;
  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-stretch justify-start bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-e border-slate-200 bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">إدارة الحساب</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
          {row.name}
          {row.is_frozen && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">مجمّد</span>}
          {row.under_audit && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">تحت التدقيق</span>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[['الفروع', row.branches], ['العمليات', row.orders], ['الموظفون', row.staff], ['الإيراد', sar(row.revenue)]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">{l}</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900" dir="ltr">{v}</div>
            </div>
          ))}
        </div>

        {/* التزام دفع العمولة — من واقع سجل التحصيل الشهري */}
        <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">الالتزام بدفع العمولة</div>
        <div className={`mt-3 rounded-xl border p-4 ${row.compliance?.tone === 'ok' ? 'border-emerald-200 bg-emerald-50' : row.compliance?.tone === 'late' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className={`text-sm font-bold ${row.compliance?.tone === 'ok' ? 'text-emerald-700' : row.compliance?.tone === 'late' ? 'text-rose-700' : 'text-slate-600'}`}>
            {row.compliance?.label || 'لا مستحقات مسجّلة بعد'}
          </div>
          {row.compliance?.detail && <div className="mt-1 text-xs font-medium text-slate-500">{row.compliance.detail}</div>}
        </div>

        {/* الإجراء الإداري الوحيد: تجميد/حظر */}
        <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">إجراء إداري</div>
        <div className="mt-3">
          <button onClick={() => onFreeze(row.id, !row.is_frozen)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors ${row.is_frozen ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {row.is_frozen ? 'إلغاء حظر الحساب' : 'حظر / تجميد الحساب'}
          </button>
          <p className="mt-2 text-center text-[11px] font-medium text-slate-400">الحظر يوقف وصول المركز فوراً — قابل للعكس في أي لحظة</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminConsole({ data = {}, userName = 'المدير' }) {
  const { metrics = {}, requests = [], orders = [], workers = [], macro = {}, leaderboard = [] } = data;
  const [active, setActive] = useState('dashboard');
  const [lang, setLang] = useState('ar');
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const labelOf = (p) => (isAr ? p.label : p.en);
  const TITLE = Object.fromEntries(PAGES.map((p) => [p.k, labelOf(p)]));
  const [lbRows, setLbRows] = useState(leaderboard);
  const [manageId, setManageId] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const manageRow = lbRows.find((r) => r.id === manageId) || null;

  // Optimistic governance mutators — patch the row instantly, revert on failure.
  function govMutate(id, patch, run, okMsg, errMsg) {
    const prev = lbRows;
    setLbRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    run().then((res) => {
      if (!res?.ok) { setLbRows(prev); flash(errMsg); } else flash(okMsg);
    }).catch(() => { setLbRows(prev); flash(errMsg); });
  }
  const onFreeze = (id, status) => govMutate(id, { is_frozen: status }, () => toggleMerchantFreeze(id, status), status ? 'تم تجميد الحساب' : 'تم إلغاء التجميد', 'تعذّر تنفيذ العملية');

  function renderView() {
    switch (active) {
      case 'dashboard': return (
        <DashboardContainer role="admin" orders={orders} workers={workers}>
          {/* الرسم أولاً — Studio parity مع فلاتره المنسدلة */}
          <UnifiedChart showControls />

          {/* شريط الأرقام — يتفاعل مع فلتر الفترة أعلاه ويقارن بالفترة السابقة */}
          <AdminHomeStrip macro={macro} sarFn={sar} />
        </DashboardContainer>
      );
      case 'live': return <CentersLive />;
      case 'requests': return <RequestsView initial={requests} flash={flash} />;
      case 'finance': return <FinanceView metrics={metrics} orders={orders} centers={lbRows} />;
      case 'governance': return <GovernanceView />;
      case 'settings': return <CentersControl rows={lbRows} onManage={setManageId} />;
      default: return null;
    }
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar — desktop */}
      <aside className={`fixed inset-y-0 z-40 hidden w-64 flex-col border-slate-200 bg-slate-50 md:flex ${isAr ? 'right-0 border-l' : 'left-0 border-r'}`}>
        {/* Brand — same wordmark as the public landing */}
        <div className="flex h-16 items-center border-b border-slate-200 px-5" dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VOLD MOTOR" className="h-6 w-auto" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {PAGES.map((it) => {
            const on = active === it.k;
            return (
              <button key={it.k} onClick={() => setActive(it.k)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-medium transition-colors ${on ? 'bg-blue-50 font-semibold text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}>
                <it.Icon size={18} className="flex-none" /><span className="truncate">{labelOf(it)}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 border-t border-slate-200 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{(userName || 'A').charAt(0).toUpperCase()}</div>
          <div className="min-w-0"><div className="truncate text-sm font-bold">{userName}</div><div className="text-xs text-slate-400">Super Admin</div></div>
        </div>
      </aside>

      {/* Main */}
      <div className={`flex min-h-screen flex-col ${isAr ? 'md:mr-64' : 'md:ml-64'}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl md:px-8">
          <h1 className="text-[15px] font-bold">{TITLE[active]}</h1>
          <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {[['ar', 'AR'], ['en', 'EN']].map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${lang === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {l}
              </button>
            ))}
          </div>
          {active === 'live' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              بث مباشر
            </span>
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white md:hidden">{(userName || 'A').charAt(0).toUpperCase()}</div>
          )}
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {renderView()}
        </main>
      </div>

      {/* Mobile bottom nav — key sections */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-slate-50 md:hidden">
        {[['dashboard', LayoutDashboard], ['requests', Inbox], ['finance', Wallet], ['live', RadioTower]].map(([k, Icon]) => {
          const on = active === k;
          return (
            <button key={k} onClick={() => setActive(k)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${on ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon size={20} /><span className="truncate px-1">{TITLE[k].split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      <ManageSheet row={manageRow} onFreeze={onFreeze} onClose={() => setManageId(null)} />

      {toast && <div className="pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    </div>
  );
}
