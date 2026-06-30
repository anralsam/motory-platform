'use client';

/**
 * AdminConsole — VOLD MOTOR Super-Admin command center.
 * Dark "GitHub Primer" technical theme (admin only; merchant/worker stay light).
 * Grouped sidebar (Operations / Finance / Governance) with tab-based content
 * rendered in-place (no route changes). Real data for centers + join requests
 * (service-role via server props; approve/reject through the admin-merchants Edge
 * Function). Modules without a DB table yet render clearly-labelled mock views.
 */
import { useState } from 'react';
import {
  Store, Inbox, AlertOctagon, Wallet, ReceiptText, Banknote, ScrollText, ShieldCheck,
  Settings, MoreHorizontal, Globe, Activity, Gauge, Car, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';
import DashboardContainer from './dna/DashboardContainer';
import UnifiedChart from './dna/UnifiedChart';

const EDGE = `${SUPABASE_URL}/functions/v1/admin-merchants`;
const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ﷼`;

const GROUPS = [
  { title: 'العمليات', items: [
    { k: 'centers', label: 'المراكز والورش النشطة', Icon: Store },
    { k: 'requests', label: 'طلبات الانضمام والتدقيق', Icon: Inbox },
    { k: 'disputes', label: 'مركز النزاعات والشكاوى', Icon: AlertOctagon },
  ] },
  { title: 'المالية', items: [
    { k: 'commissions', label: 'الأرباح والعمولات', Icon: Wallet },
    { k: 'subscriptions', label: 'الاشتراكات وفواتير B2B', Icon: ReceiptText },
    { k: 'settlements', label: 'تسويات التحويلات البنكية', Icon: Banknote },
  ] },
  { title: 'الحوكمة والأمان', items: [
    { k: 'audit', label: 'سجل حركات الموظفين', Icon: ScrollText },
    { k: 'rbac', label: 'صلاحيات المشرفين', Icon: ShieldCheck },
    { k: 'settings', label: 'إعدادات المنصة', Icon: Settings },
  ] },
];
const ALL_ITEMS = GROUPS.flatMap((g) => g.items);
const TITLE = Object.fromEntries(ALL_ITEMS.map((i) => [i.k, i.label]));

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

function MetricCard({ icon: Icon, label, value, delta }) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-wider ${MUTED}`}>{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon size={18} /></span>
      </div>
      <div className="mt-4 font-inter text-3xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{value}</div>
      {delta ? <div className="mt-1 text-xs font-semibold text-emerald-600" dir="ltr">▲ {delta}</div> : null}
    </div>
  );
}

/* ── Centers table with actions ── */
function CentersView({ centers, flash }) {
  const [menu, setMenu] = useState(null);
  if (!centers.length) return <Empty label="لا توجد مراكز نشطة" />;
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="grid grid-cols-[1.4fr_1fr_1fr_auto_auto_44px] items-center gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>المركز</span><span>المدينة</span><span>الباقة</span><span>المهندسون</span><span>الحالة</span><span />
      </div>
      <div className="divide-y divide-slate-200">
        {centers.map((c) => (
          <div key={c.id} className="grid grid-cols-[1.4fr_1fr_1fr_auto_auto_44px] items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-slate-100">
            <span className="truncate font-semibold text-slate-900">{c.name}</span>
            <span className={MUTED}>{c.city || '—'}</span>
            <span><Pill tone="blue">{c.pkg}</Pill></span>
            <span className="tabular-nums text-slate-900" dir="ltr">{c.engineers}</span>
            <span><Pill tone="green">نشط</Pill></span>
            <div className="relative">
              <button onClick={() => setMenu(menu === c.id ? null : c.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><MoreHorizontal size={16} /></button>
              {menu === c.id && (
                <div className="absolute end-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  {[['حظر مؤقت', 'red'], ['تدقيق مالي', 'gray'], ['محاكاة الدخول', 'gray']].map(([t]) => (
                    <button key={t} onClick={() => { setMenu(null); flash(`${t} — ${c.name}`); }} className="block w-full px-3 py-2 text-start text-sm text-slate-700 hover:bg-slate-100">{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
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
                <span className="truncate text-sm font-bold text-slate-900">{r.name}</span>
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
            <button onClick={() => onManage(r)}
              className="flex flex-none items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:text-blue-600">
              <Settings size={13} /> إدارة الحساب
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageSheet({ row, flash, onClose }) {
  if (!row) return null;
  const ACTIONS = [['تدقيق مالي إجباري', 'بدأ التدقيق المالي'], ['تجميد الحساب مؤقتاً', 'تم تجميد الحساب'], ['إعادة ضبط الباقة', 'أُعيد ضبط الباقة']];
  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-stretch justify-start bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-e border-slate-200 bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">إدارة الحساب</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="mt-1 text-sm font-medium text-slate-500">{row.name}</div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {[['الفروع', row.branches], ['العمليات', row.orders], ['الموظفون', row.staff], ['الإيراد', sar(row.revenue)]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">{l}</div>
              <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900" dir="ltr">{v}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-400">تجاوزات إدارية</div>
        <div className="mt-3 space-y-2">
          {ACTIONS.map(([label, msg]) => (
            <button key={label} onClick={() => { flash(`${msg} — ${row.name}`); onClose(); }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              {label}<span className="text-slate-300">›</span>
            </button>
          ))}
        </div>
        <MockNote />
      </div>
    </div>
  );
}

export default function AdminConsole({ data = {}, userName = 'المدير' }) {
  const { metrics = {}, centers = [], requests = [], orders = [], workers = [], macro = {}, leaderboard = [] } = data;
  const [active, setActive] = useState('centers');
  const [manage, setManage] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  function renderView() {
    switch (active) {
      case 'centers': return <CentersView centers={centers} flash={flash} />;
      case 'requests': return <RequestsView initial={requests} flash={flash} />;
      case 'disputes': return <ListView cols={['الشكوى', 'المركز', 'الحالة']} rows={[['تأخر تسليم سيارة', 'مركز رائد', 'مفتوحة'], ['نزاع على فاتورة', 'ورشة الخليج', 'قيد المراجعة']]} />;
      case 'commissions': return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <MetricCard icon={Wallet} label="صافي العمولات" value={sar(metrics.commissions)} />
          <MetricCard icon={Activity} label="حجم المعاملات" value={sar(metrics.gmv)} />
          <MetricCard icon={Gauge} label="متوسط العمولة" value="10%" />
        </div>
      );
      case 'subscriptions': return <ListView cols={['المركز', 'الباقة', 'المستحق']} rows={[['مركز رائد', 'Pro', '٩٩٩ ﷼'], ['ورشة الخليج', 'Basic', '٤٩٩ ﷼']]} />;
      case 'settlements': return <ListView cols={['المركز', 'المبلغ', 'الحالة']} rows={[['مركز رائد', '٢٤٬٠٥٠ ﷼', 'بانتظار التحويل'], ['ورشة الخليج', '٨٬٢٠٠ ﷼', 'تمّت']]} />;
      case 'audit': return <AuditView />;
      case 'rbac': return <RbacView />;
      case 'settings': return <ListView cols={['الإعداد', 'القيمة']} rows={[['نسبة العمولة', '10%'], ['حد المحاولات قبل القفل', '5'], ['التحقق بخطوتين', 'مفعّل']]} />;
      default: return null;
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-64 flex-col border-s border-slate-200 bg-slate-50 md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5" dir="ltr">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none"><path d="M6 10 L24 42 L42 10" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className="text-sm font-extrabold tracking-wide">VOLD <span className="text-blue-600">MOTOR</span></span>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{g.title}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const on = active === it.k;
                  return (
                    <button key={it.k} onClick={() => setActive(it.k)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors ${on ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}>
                      <it.Icon size={17} className="flex-none" /><span className="truncate">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
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
          <a href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600">
            <ArrowLeft size={16} className="rotate-180" /><span>العودة للموقع</span>
          </a>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {/* Grand Unified DNA — same brain (range+metric) + master chart as merchant/worker */}
          <DashboardContainer role="admin" orders={orders} workers={workers}>
            {/* Multi-tenant macro summary — consolidated across all centers */}
            <MacroSummary macro={macro} />

            {/* persistent platform governance KPI strip */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Wallet} label="صافي عمولات المنصة" value={sar(metrics.commissions)} delta="12%" />
              <MetricCard icon={Gauge} label="نجاح الالتزام SLA" value={`${metrics.slaPct || 0}%`} />
              <MetricCard icon={ShieldCheck} label="ورش تحت الفحص" value={(metrics.underInspection || 0).toLocaleString('en-US')} />
              <MetricCard icon={Car} label="سيارات داخل الصالات" value={(metrics.carsInOps || 0).toLocaleString('en-US')} />
            </div>

            <UnifiedChart showControls />

            {/* Merchant leaderboard / ranking matrix */}
            <MerchantLeaderboard rows={leaderboard} onManage={setManage} />

            {renderView()}
          </DashboardContainer>
        </main>
      </div>

      {/* Mobile bottom nav — key sections */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-slate-50 md:hidden">
        {[['centers', Store], ['requests', Inbox], ['commissions', Wallet], ['audit', ScrollText]].map(([k, Icon]) => {
          const on = active === k;
          return (
            <button key={k} onClick={() => setActive(k)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${on ? 'text-blue-600' : 'text-slate-400'}`}>
              <Icon size={20} /><span className="truncate px-1">{TITLE[k].split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      <ManageSheet row={manage} flash={flash} onClose={() => setManage(null)} />

      {toast && <div className="pointer-events-none fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xl md:bottom-6">{toast}</div>}
    </div>
  );
}
