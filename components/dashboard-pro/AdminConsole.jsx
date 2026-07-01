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
import { useState } from 'react';
import {
  LayoutDashboard, RadioTower, Inbox, Wallet, ShieldCheck, Settings,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { toggleMerchantFreeze, toggleMerchantAudit, resetMerchantTier } from '@/app/dashboard-pro/actions';
import DashboardContainer from './dna/DashboardContainer';
import UnifiedChart from './dna/UnifiedChart';
import CentersLive from './CentersLive';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;
const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

// ── Flat, concise nav — Studio parity ──
const PAGES = [
  { k: 'dashboard', label: 'لوحة البيانات', Icon: LayoutDashboard },
  { k: 'live', label: 'المراكز لايف', Icon: RadioTower },
  { k: 'requests', label: 'طلبات الانضمام', Icon: Inbox },
  { k: 'finance', label: 'المالية', Icon: Wallet },
  { k: 'governance', label: 'الحوكمة والأمان', Icon: ShieldCheck },
  { k: 'settings', label: 'إعدادات المنصة', Icon: Settings },
];
const TITLE = Object.fromEntries(PAGES.map((p) => [p.k, p.label]));

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
function Empty({ label }) {
  return <div className={`${CARD} grid place-items-center py-16 text-sm ${MUTED}`}>{label}</div>;
}

/* ── Finance page: العمولات · الاشتراكات · التسويات (folded sub-tabs) ── */
function FinanceView({ metrics }) {
  const [tab, setTab] = useState('commissions');
  return (
    <div className="space-y-6">
      <SubTabs value={tab} onChange={setTab} tabs={[['commissions', 'الأرباح والعمولات'], ['subscriptions', 'الاشتراكات وفواتير B2B'], ['settlements', 'تسويات التحويلات']]} />
      {tab === 'commissions' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <StatCard label="صافي العمولات" value={sar(metrics.commissions)} hint="نسبة المنصة 10%" />
          <StatCard label="حجم المعاملات" value={sar(metrics.gmv)} hint="إجمالي قيمة العمليات المكتملة" />
          <StatCard label="متوسط العمولة" value="10%" hint="على كل عملية مكتملة" />
        </div>
      )}
      {tab === 'subscriptions' && <ListView cols={['المركز', 'الباقة', 'المستحق']} rows={[['مركز رائد', 'Pro', '٩٩٩ ﷼'], ['ورشة الخليج', 'Basic', '٤٩٩ ﷼']]} />}
      {tab === 'settlements' && <ListView cols={['المركز', 'المبلغ', 'الحالة']} rows={[['مركز رائد', '٢٤٬٠٥٠ ﷼', 'بانتظار التحويل'], ['ورشة الخليج', '٨٬٢٠٠ ﷼', 'تمّت']]} />}
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

function MacroSummary({ macro = {} }) {
  const cells = [
    { label: 'إجمالي الإيرادات المنصية', value: sar(macro.revenue) },
    { label: 'المراكز النشطة', value: (macro.activeCenters || 0).toLocaleString('en-US') },
    { label: 'حجم العمليات الكلي', value: (macro.totalOps || 0).toLocaleString('en-US') },
  ];
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-[#fafafa]/50 md:grid-cols-3">
      {cells.map((c, i) => (
        <div key={c.label} className={`p-6 ${i > 0 ? 'border-slate-200 md:border-e' : ''}`}>
          <div className="text-sm font-medium text-slate-500">{c.label}</div>
          <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 tabular-nums" dir="ltr">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function MerchantLeaderboard({ rows = [], onManage }) {
  if (!rows.length) return <Empty label="لا توجد مراكز نشطة بعد" />;
  return (
    <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-lg font-bold tracking-tight text-slate-900">مصفوفة ترتيب وتقييم المراكز</div>
      <div className="mt-1 mb-6 text-sm font-medium text-slate-500">ترتيب المراكز حسب الإيراد ومساهمتها في السوق</div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-500" dir="ltr">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold text-slate-900">{r.name}</span>
                  {r.is_frozen && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">مجمّد</span>}
                  {r.under_audit && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">تدقيق</span>}
                  {r.tier_plan === 'enterprise' && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">Enterprise</span>}
                </span>
                <div className="flex flex-none items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{r.branches} فرع</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{r.orders} عملية</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{r.staff} موظف</span>
                  <span className="font-mono text-sm font-bold tabular-nums text-slate-900" dir="ltr">{sar(r.revenue)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-l from-blue-500 to-blue-600" style={{ width: `${Math.max(3, r.share)}%` }} />
                </div>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-400" dir="ltr">{r.share}%</span>
              </div>
            </div>
            <button onClick={() => onManage(r.id)}
              className="flex flex-none items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600">
              <Settings size={13} /> إدارة الحساب
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageSheet({ row, onFreeze, onAudit, onTier, onClose }) {
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

        {/* Tier override */}
        <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">الباقة</div>
        <div className="mt-3 inline-flex gap-1 rounded-xl bg-slate-100 p-1">
          {[['standard', 'قياسية'], ['enterprise', 'Enterprise']].map(([k, label]) => (
            <button key={k} onClick={() => onTier(row.id, k)}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${row.tier_plan === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Lifecycle overrides */}
        <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">تجاوزات إدارية</div>
        <div className="mt-3 space-y-2">
          <button onClick={() => onFreeze(row.id, !row.is_frozen)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors ${row.is_frozen ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {row.is_frozen ? 'إلغاء تجميد الحساب' : 'تجميد الحساب'}
          </button>
          <button onClick={() => onAudit(row.id, !row.under_audit)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-colors ${row.under_audit ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            {row.under_audit ? 'إنهاء التدقيق الإجباري' : 'بدء تدقيق إجباري'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminConsole({ data = {}, userName = 'المدير' }) {
  const { metrics = {}, requests = [], orders = [], workers = [], macro = {}, leaderboard = [] } = data;
  const [active, setActive] = useState('dashboard');
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
  const onAudit = (id, status) => govMutate(id, { under_audit: status }, () => toggleMerchantAudit(id, status), status ? 'بدأ التدقيق الإجباري' : 'انتهى التدقيق', 'تعذّر تنفيذ العملية');
  const onTier = (id, tier) => govMutate(id, { tier_plan: tier }, () => resetMerchantTier(id, tier), `أُعيد ضبط الباقة: ${tier}`, 'تعذّر تنفيذ العملية');

  function renderView() {
    switch (active) {
      case 'dashboard': return (
        <DashboardContainer role="admin" orders={orders} workers={workers}>
          {/* Multi-tenant macro summary — consolidated across all centers */}
          <MacroSummary macro={macro} />

          {/* platform governance KPI strip — clean Studio cards, no icon chips */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="صافي عمولات المنصة" value={sar(metrics.commissions)} delta="12%" hint="مقارنةً بالشهر الماضي" />
            <StatCard label="نجاح الالتزام SLA" value={`${metrics.slaPct || 0}%`} hint="نسبة العمليات المكتملة" />
            <StatCard label="ورش تحت الفحص" value={(metrics.underInspection || 0).toLocaleString('en-US')} hint="طلبات بانتظار التدقيق" />
            <StatCard label="سيارات داخل الصالات" value={(metrics.carsInOps || 0).toLocaleString('en-US')} hint="عمليات جارية الآن" />
          </div>

          {/* Master chart — dropdown filters, Studio headline */}
          <UnifiedChart showControls />

          {/* Merchant leaderboard / ranking matrix */}
          <MerchantLeaderboard rows={lbRows} onManage={setManageId} />
        </DashboardContainer>
      );
      case 'live': return <CentersLive />;
      case 'requests': return <RequestsView initial={requests} flash={flash} />;
      case 'finance': return <FinanceView metrics={metrics} />;
      case 'governance': return <GovernanceView />;
      case 'settings': return <ListView cols={['الإعداد', 'القيمة']} rows={[['نسبة العمولة', '10%'], ['حد المحاولات قبل القفل', '5'], ['التحقق بخطوتين', 'مفعّل']]} />;
      default: return null;
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-64 flex-col border-s border-slate-200 bg-slate-50 md:flex">
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
                <it.Icon size={18} className="flex-none" /><span className="truncate">{it.label}</span>
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
      <div className="flex min-h-screen flex-col md:me-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl md:px-8">
          <h1 className="text-[15px] font-bold">{TITLE[active]}</h1>
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
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {renderView()}
        </main>
      </div>

      {/* Mobile bottom nav — key sections */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-slate-50 md:hidden">
        {[['dashboard', LayoutDashboard], ['live', RadioTower], ['requests', Inbox], ['finance', Wallet]].map(([k, Icon]) => {
          const on = active === k;
          return (
            <button key={k} onClick={() => setActive(k)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${on ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon size={20} /><span className="truncate px-1">{TITLE[k].split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      <ManageSheet row={manageRow} onFreeze={onFreeze} onAudit={onAudit} onTier={onTier} onClose={() => setManageId(null)} />

      {toast && <div className="pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    </div>
  );
}
