'use client';

/**
 * VOLD MOTOR — Dashboard Pro (clean Premium Bento Grid)
 * Fresh, self-contained shell: fixed dark sidebar + 4 metric cards + charts.
 * NO merchant / admin / Supabase logic. Styles injected inline via the yt- class
 * convention. This route is independent of /vm-control-center.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const MONTH_LABELS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ── Demo data (static — no backend) ──
const GROWTH = [4, 6, 5, 9, 8, 12, 11, 14, 13, 17, 16, 21];
const METRICS = [
  { key: 'total', label: 'إجمالي العمليات', value: '1,284', icon: 'grid', foot: 'منذ الإطلاق', footClass: 'up' },
  { key: 'active', label: 'نشطة الآن', value: '342', icon: 'pulse', foot: '⬆ +12% هذا الشهر', footClass: 'up' },
  { key: 'pending', label: 'قيد المراجعة', value: '27', icon: 'clock', foot: '⚠ تحتاج متابعة', footClass: 'warn' },
  { key: 'revenue', label: 'الإيراد الشهري', value: '٤٨٬٢٠٠ ﷼', icon: 'chart', foot: 'صافي بعد العمولة', footClass: '' },
];
const DONUT = [
  { name: 'مكتملة', value: 62, color: '#16a34a' },
  { name: 'جارية', value: 28, color: '#2563eb' },
  { name: 'متأخرة', value: 10, color: '#dc2626' },
];

function Icon({ name }) {
  const common = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' };
  switch (name) {
    case 'grid':
      return (<svg {...common}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>);
    case 'pulse':
      return (<svg {...common}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
    case 'clock':
      return (<svg {...common}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
    case 'chart':
      return (<svg {...common}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>);
    default:
      return null;
  }
}

export default function DashboardPro() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [growthPeriod, setGrowthPeriod] = useState('month');
  const [today, setToday] = useState('VOLD MOTOR Platform');

  useEffect(() => {
    const now = new Date();
    setToday(`${DAY_NAMES[now.getDay()]}، ${now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  }, []);

  // Esc closes the mobile sidebar
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const growthData = useMemo(() => MONTH_LABELS.map((label, i) => ({ label, value: GROWTH[i] })), []);
  const donutTotal = useMemo(() => DONUT.reduce((s, d) => s + d.value, 0), []);

  const pickNav = (k) => { setActiveNav(k); setSidebarOpen(false); };

  const NAV = [
    { k: 'overview', label: 'نظرة عامة', icon: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>) },
    { k: 'operations', label: 'العمليات', icon: (<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>) },
    { k: 'analytics', label: 'التحليلات', icon: (<><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>) },
    { k: 'team', label: 'الفريق', icon: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>) },
  ];

  return (
    <div dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Sidebar overlay (mobile) */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="yt-layout">
        {/* ══ SIDEBAR ══ */}
        <aside className={`yt-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="yt-sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M6 10 L24 42 L42 10" stroke="url(#dpg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="dpg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FAFAFA" />
                  <stop offset=".55" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <div className="yt-logo-text">
              <span className="yt-logo-name">VOLD <span>MOTOR</span></span>
              <span className="yt-logo-sub">Dashboard Pro</span>
            </div>
          </div>

          <nav className="yt-sidebar-nav">
            <div className="yt-nav-section">
              <div className="yt-nav-label">الرئيسية</div>
              {NAV.map((n) => (
                <button key={n.k} className={`yt-nav-item${activeNav === n.k ? ' active' : ''}`} onClick={() => pickNav(n.k)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">{n.icon}</svg>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="yt-sidebar-user">
            <div className="yt-su-avatar">V</div>
            <div className="yt-su-info">
              <div className="yt-su-name">المدير</div>
              <div className="yt-su-role">Pro</div>
            </div>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <div className="yt-main">
          {/* Topbar */}
          <header className="yt-topbar">
            <div className="yt-topbar-left">
              <button className="burger-btn" onClick={() => setSidebarOpen(true)} aria-label="القائمة">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <div>
                <div className="yt-page-title">لوحة التحكم</div>
                <div className="yt-page-sub">{today}</div>
              </div>
            </div>
            <div className="yt-topbar-right">
              <button className="yt-btn">إجراء جديد</button>
            </div>
          </header>

          {/* Content */}
          <main className="yt-content">
            {/* Hero */}
            <div className="rev-hero fade-in">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="rh-label">نظرة سريعة · الأداء العام</div>
                <div className="rh-val">٩٤٪</div>
                <div className="rh-change">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  </svg>
                  <span>معدل إنجاز ممتاز هذا الشهر</span>
                </div>
              </div>
              <div className="rh-actions">
                <button className="rh-btn rh-btn-primary">عرض التقرير</button>
                <button className="rh-btn rh-btn-ghost">تصدير</button>
              </div>
            </div>

            {/* Stats grid — 4 top-level metric cards */}
            <div className="sa-stats fade-in" style={{ animationDelay: '.06s' }}>
              {METRICS.map((m) => (
                <div className="sa-stat" key={m.key}>
                  <div className="sa-stat-head">
                    <div className="sa-stat-label">{m.label}</div>
                    <div className={`sa-stat-icon icon-${m.key}`}>
                      <Icon name={m.icon} />
                    </div>
                  </div>
                  <div className="sa-stat-val">{m.value}</div>
                  <div className={`sa-stat-footer ${m.footClass}`}>{m.foot}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="charts-row fade-in" style={{ animationDelay: '.12s' }}>
              {/* Growth bar chart */}
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>نمو العمليات</h3>
                    <p>إجمالي العمليات الجديدة خلال العام</p>
                  </div>
                  <div className="chart-period">
                    <button className={`cp-btn${growthPeriod === 'month' ? ' active' : ''}`} onClick={() => setGrowthPeriod('month')}>شهري</button>
                    <button className={`cp-btn${growthPeriod === 'year' ? ' active' : ''}`} onClick={() => setGrowthPeriod('year')}>سنوي</button>
                  </div>
                </div>
                <div style={{ height: 180, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={28} />
                      <Tooltip
                        cursor={{ fill: 'rgba(37,99,235,.06)' }}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit' }}
                        labelStyle={{ fontWeight: 700 }}
                        formatter={(v) => [v, 'عملية']}
                      />
                      <Bar dataKey="value" fill="rgba(37,99,235,.15)" stroke="#2563eb" strokeWidth={2} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status donut chart */}
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>توزيع الحالات</h3>
                    <p>نسبة المكتمل والجاري والمتأخر</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ width: 140, height: 140, flex: 'none', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={DONUT} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="#fff" strokeWidth={3}>
                          {DONUT.map((d) => (<Cell key={d.name} fill={d.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit' }} formatter={(v, n) => [`${v}%`, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {DONUT.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 11, height: 11, borderRadius: '50%', background: d.color, flex: 'none' }} />
                        <span style={{ fontSize: '.85rem', color: 'var(--vm-muted)' }}>{d.name}</span>
                        <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--vm-ink)', marginRight: 'auto' }}>
                          {Math.round((d.value / donutTotal) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Inline CSS — Premium Bento shell. yt- namespaced, scoped via --vm-* vars.
// No table / modal / toast — this is a clean presentational dashboard.
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
.yt-layout, .yt-layout *, .yt-layout *::before, .yt-layout *::after { box-sizing:border-box; }
:root{
  --vm-blue:#2563eb; --vm-ink:#09090b; --vm-muted:#6b7280; --vm-paper:#fff;
  --vm-bg:#f9f9f9; --vm-line:#e5e7eb; --vm-sidebar-w:230px;
  --vm-shadow-card:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
}
.yt-layout{ display:flex; min-height:100vh; background:var(--vm-bg);
  color:var(--vm-ink); font-family:'Almarai',system-ui,sans-serif; line-height:1.6; }
.yt-layout a{ text-decoration:none; color:inherit; }
.yt-layout button{ font-family:inherit; cursor:pointer; }

/* Sidebar */
.yt-sidebar{ width:var(--vm-sidebar-w); background:#09090b; color:#fff;
  display:flex; flex-direction:column; position:fixed; top:0; right:0; bottom:0;
  z-index:100; overflow-y:auto; transition:transform .25s ease; }
@media(max-width:960px){ .yt-sidebar{ transform:translateX(100%); } .yt-sidebar.open{ transform:translateX(0); } }
.yt-sidebar-logo{ display:flex; align-items:center; gap:10px; padding:20px 18px 16px;
  border-bottom:1px solid rgba(255,255,255,.08); direction:ltr; justify-content:flex-start; }
.yt-sidebar-logo svg{ flex:none; }
.yt-logo-text{ display:flex; flex-direction:column; }
.yt-logo-name{ font-weight:800; font-size:1rem; letter-spacing:.04em; color:#fff; line-height:1.1; }
.yt-logo-name span{ color:#3b82f6; }
.yt-logo-sub{ font-size:.6rem; font-weight:700; color:rgba(255,255,255,.4);
  letter-spacing:.14em; margin-top:1px; text-transform:uppercase; }
.yt-sidebar-nav{ flex:1; padding:12px 0; }
.yt-nav-section{ margin-bottom:4px; }
.yt-nav-label{ font-size:.62rem; font-weight:700; color:rgba(255,255,255,.35);
  letter-spacing:.12em; text-transform:uppercase; padding:12px 18px 5px; }
.yt-nav-item{ display:flex; align-items:center; gap:11px; padding:10px 18px;
  font-size:.88rem; font-weight:700; color:rgba(255,255,255,.65); transition:.15s;
  cursor:pointer; border:0; background:none; width:100%; text-align:right; position:relative; }
.yt-nav-item:hover{ background:rgba(255,255,255,.07); color:#fff; }
.yt-nav-item.active{ background:rgba(37,99,235,.22); color:#fff; }
.yt-nav-item.active::before{ content:''; position:absolute; right:0; top:4px; bottom:4px;
  width:3px; border-radius:0 3px 3px 0; background:#3b82f6; }
.yt-sidebar-user{ padding:16px 18px; border-top:1px solid rgba(255,255,255,.08);
  display:flex; align-items:center; gap:10px; }
.yt-su-avatar{ width:34px; height:34px; border-radius:50%; background:#2563eb; color:#fff;
  display:grid; place-items:center; font-size:.9rem; font-weight:900; flex:none; }
.yt-su-info{ flex:1; min-width:0; }
.yt-su-name{ font-size:.88rem; font-weight:800; color:#fff; }
.yt-su-role{ font-size:.7rem; color:rgba(255,255,255,.45); }

/* Main */
.yt-main{ flex:1; margin-right:var(--vm-sidebar-w); display:flex; flex-direction:column; min-height:100vh; }
@media(max-width:960px){ .yt-main{ margin-right:0; } }
.yt-topbar{ background:var(--vm-paper); border-bottom:1px solid var(--vm-line); height:64px; padding:0 24px;
  display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; backdrop-filter:blur(8px); }
.yt-topbar-left{ display:flex; align-items:center; gap:14px; }
.yt-topbar-right{ display:flex; align-items:center; gap:10px; }
.burger-btn{ width:38px; height:38px; border-radius:9px; border:1.5px solid var(--vm-line);
  background:none; display:none; place-items:center; cursor:pointer; color:var(--vm-muted); transition:.15s; }
@media(max-width:960px){ .burger-btn{ display:grid; } }
.burger-btn:hover{ border-color:var(--vm-blue); color:var(--vm-blue); }
.yt-page-title{ font-size:1.08rem; font-weight:900; color:var(--vm-ink); line-height:1.1; }
.yt-page-sub{ font-size:.74rem; color:var(--vm-muted); font-weight:600; }
.yt-btn{ display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:10px;
  font-family:inherit; font-size:.85rem; font-weight:700; cursor:pointer; transition:.15s; border:0; background:var(--vm-blue); color:#fff; }
.yt-btn:hover{ background:#1d4ed8; }
.yt-content{ flex:1; padding:28px; }
@media(max-width:960px){ .yt-content{ padding:16px; } }

/* Hero */
.rev-hero{ background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%); border-radius:20px; padding:28px 32px;
  display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; color:#fff; position:relative; overflow:hidden; flex-wrap:wrap; gap:16px; }
.rev-hero::before{ content:''; position:absolute; top:-40px; left:-40px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.06); pointer-events:none; }
.rh-label{ font-size:.82rem; font-weight:700; opacity:.75; letter-spacing:.06em; margin-bottom:8px; }
.rh-val{ font-size:2.6rem; font-weight:900; line-height:1; font-family:'Inter',sans-serif; letter-spacing:-.03em; }
.rh-change{ display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.15); border-radius:8px; padding:5px 11px; font-size:.8rem; font-weight:700; margin-top:10px; }
.rh-actions{ display:flex; gap:10px; position:relative; z-index:1; }
.rh-btn{ padding:10px 20px; border-radius:11px; font-family:inherit; font-size:.88rem; font-weight:700; cursor:pointer; transition:.15s; border:0; }
.rh-btn-primary{ background:#fff; color:#2563eb; }
.rh-btn-primary:hover{ background:#f0f6ff; }
.rh-btn-ghost{ background:rgba(255,255,255,.15); color:#fff; border:1.5px solid rgba(255,255,255,.3); }
.rh-btn-ghost:hover{ background:rgba(255,255,255,.25); }

/* Stats — Bento metric cards */
.sa-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
@media(max-width:900px){ .sa-stats{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:480px){ .sa-stats{ grid-template-columns:1fr; } }
.sa-stat{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; padding:20px;
  box-shadow:var(--vm-shadow-card); display:flex; flex-direction:column; gap:14px; transition:border-color .2s, box-shadow .2s; }
.sa-stat:hover{ border-color:rgba(37,99,235,.25); box-shadow:0 4px 18px rgba(37,99,235,.06); }
.sa-stat-head{ display:flex; align-items:center; justify-content:space-between; }
.sa-stat-icon{ width:38px; height:38px; border-radius:11px; display:grid; place-items:center; flex:none; }
.icon-total{ background:rgba(37,99,235,.1); color:#2563eb; }
.icon-active{ background:#dcfce7; color:#15803d; }
.icon-pending{ background:#fef9c3; color:#a16207; }
.icon-revenue{ background:#ede9fe; color:#6d28d9; }
.sa-stat-label{ font-size:.78rem; font-weight:600; color:var(--vm-muted); }
.sa-stat-val{ font-size:2.2rem; font-weight:900; color:var(--vm-ink); line-height:1; letter-spacing:-.04em;
  font-family:'Inter',sans-serif; font-variant-numeric:tabular-nums; align-self:flex-start; }
.sa-stat-footer{ font-size:.76rem; font-weight:600; color:var(--vm-muted); margin-top:-8px; }
.sa-stat-footer.up{ color:#16a34a; }
.sa-stat-footer.warn{ color:#d97706; }

/* Charts */
.charts-row{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
@media(max-width:860px){ .charts-row{ grid-template-columns:1fr; } }
.chart-card{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; padding:22px; box-shadow:var(--vm-shadow-card); }
.chart-card-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; }
.chart-card-head h3{ font-size:.97rem; font-weight:900; color:var(--vm-ink); margin:0; }
.chart-card-head p{ font-size:.78rem; color:var(--vm-muted); margin:3px 0 0; }
.chart-period{ display:flex; gap:4px; background:var(--vm-bg); border:1px solid var(--vm-line); border-radius:9px; padding:3px; }
.cp-btn{ padding:4px 10px; border-radius:6px; font-family:inherit; font-size:.75rem; font-weight:700; border:0; background:none; color:var(--vm-muted); cursor:pointer; transition:.15s; }
.cp-btn.active{ background:var(--vm-paper); color:var(--vm-ink); box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* Mobile sidebar overlay */
.sidebar-overlay{ display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:90; }
@media(max-width:960px){ .sidebar-overlay.open{ display:block; } }

.fade-in{ animation:fadeUp .4s ease both; }
@keyframes fadeUp{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:none; } }
`;
