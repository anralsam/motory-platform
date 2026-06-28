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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';

const MONTH_LABELS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ── Demo data (static — no backend) ──
const GROWTH = [4, 6, 5, 9, 8, 12, 11, 14, 13, 17, 16, 21];
// liveKey maps each card to a computed count from join_requests.status.
// `mock` is the fallback shown when the live fetch fails (UI never crashes).
const METRICS = [
  { key: 'total', liveKey: 'total', label: 'إجمالي الطلبات', mock: '1,284', icon: 'grid', foot: 'منذ الإطلاق', footClass: 'up' },
  { key: 'active', liveKey: 'approved', label: 'المراكز المفعّلة', mock: '342', icon: 'store', foot: 'حسابات نشطة', footClass: 'up' },
  { key: 'pending', liveKey: 'pending', label: 'الطلبات المعلّقة', mock: '27', icon: 'clock', foot: '⚠ تحتاج مراجعة', footClass: 'warn' },
  { key: 'rejected', liveKey: 'rejected', label: 'الطلبات المرفوضة', mock: '12', icon: 'x', foot: 'من إجمالي الطلبات', footClass: '' },
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
    case 'store':
      return (<svg {...common}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>);
    case 'x':
      return (<svg {...common}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>);
    default:
      return null;
  }
}

export default function DashboardPro() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [growthPeriod, setGrowthPeriod] = useState('month');
  const [today, setToday] = useState('VOLD MOTOR Platform');
  // Live metric counts from join_requests, or null while loading / on failure.
  const [live, setLive] = useState(null);

  useEffect(() => {
    const now = new Date();
    setToday(`${DAY_NAMES[now.getDay()]}، ${now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  }, []);

  // ── Fetch real metric counts. On ANY failure (RLS, network, no session)
  //    we leave `live` as null so the cards fall back to the mock values and
  //    the dashboard never crashes. ──
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('join_requests').select('status');
        if (error) throw error;
        if (!active || !Array.isArray(data)) return;
        const counts = { total: data.length, pending: 0, approved: 0, rejected: 0 };
        data.forEach((r) => {
          if (r.status === 'pending') counts.pending++;
          else if (r.status === 'approved') counts.approved++;
          else if (r.status === 'rejected') counts.rejected++;
        });
        setLive(counts);
      } catch {
        // Keep mock UI visible — do not surface an error or blank the cards.
        if (active) setLive(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Esc closes the mobile sidebar
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const growthData = useMemo(() => MONTH_LABELS.map((label, i) => ({ label, value: GROWTH[i] })), []);
  // Deep-Insight: trend deltas derived from the growth series.
  const insight = useMemo(() => {
    const total = GROWTH.reduce((s, v) => s + v, 0);
    const last = GROWTH[GROWTH.length - 1];
    const prev = GROWTH[GROWTH.length - 2] || 0;
    const momDelta = prev ? Math.round(((last - prev) / prev) * 100) : 0;
    const avg = Math.round(total / GROWTH.length);
    const peak = Math.max(...GROWTH);
    const peakShare = total ? Math.round((peak / total) * 100) : 0;
    return { total, last, momDelta, avg, peak, peakShare };
  }, []);

  const pickNav = (k) => { setActiveNav(k); setSidebarOpen(false); };

  const NAV = [
    { k: 'dashboard', label: 'لوحة التحكم', icon: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>) },
    { k: 'merchants', label: 'المراكز', icon: (<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>) },
    { k: 'settings', label: 'الإعدادات', icon: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>) },
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
            {/* Page heading — airy, minimalist */}
            <div className="page-head">
              <h1>نظرة عامة</h1>
              <p>ملخّص أداء المنصة · {today}</p>
            </div>

            {/* Stats grid — 4 top-level metric cards */}
            <div className="sa-stats">{/* flat, no animation */}
              {METRICS.map((m) => (
                <div className="sa-stat" key={m.key}>
                  <div className="sa-stat-head">
                    <div className="sa-stat-label">{m.label}</div>
                    <div className={`sa-stat-icon icon-${m.key}`}>
                      <Icon name={m.icon} />
                    </div>
                  </div>
                  <div className="sa-stat-val">
                    {live ? (live[m.liveKey] ?? 0).toLocaleString('en-US') : m.mock}
                  </div>
                  <div className={`sa-stat-footer ${m.footClass}`}>{m.foot}</div>
                </div>
              ))}
            </div>

            {/* ══ Master Analysis ══ */}
            <section className="ma">
              {/* Primary growth chart */}
              <div className="ma-main">
                <div className="ma-head">
                  <div>
                    <h3>التحليل الرئيسي · نمو العمليات</h3>
                    <p>تتبّع حجم العمليات على مدار العام</p>
                  </div>
                  <div className="chart-period">
                    <button className={`cp-btn${growthPeriod === 'month' ? ' active' : ''}`} onClick={() => setGrowthPeriod('month')}>شهري</button>
                    <button className={`cp-btn${growthPeriod === 'year' ? ' active' : ''}`} onClick={() => setGrowthPeriod('year')}>سنوي</button>
                  </div>
                </div>
                <div style={{ height: 280, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="maFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} interval={0} tickMargin={10} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} width={30} />
                      <Tooltip
                        cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, fontFamily: 'inherit', boxShadow: 'none' }}
                        labelStyle={{ fontWeight: 700, color: '#09090b' }}
                        formatter={(v) => [v, 'عملية']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} fill="url(#maFill)" dot={false} activeDot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deep Insight panel */}
              <aside className="ma-side">
                <div className="ma-side-title">نظرة عميقة</div>

                <div className="ins">
                  <div className="ins-label">نمو هذا الشهر</div>
                  <div className={`ins-delta ${insight.momDelta >= 0 ? 'up' : 'down'}`}>
                    <span>{insight.momDelta >= 0 ? '▲' : '▼'}</span>
                    <span className="ins-num">{Math.abs(insight.momDelta)}%</span>
                  </div>
                </div>

                <div className="ins">
                  <div className="ins-label">إجمالي العام</div>
                  <div className="ins-num">{insight.total.toLocaleString('en-US')}</div>
                </div>

                <div className="ins">
                  <div className="ins-label">المتوسط الشهري</div>
                  <div className="ins-num">{insight.avg.toLocaleString('en-US')}</div>
                </div>

                <div className="ins">
                  <div className="ins-label">أعلى شهر</div>
                  <div className="ins-num">{insight.peak.toLocaleString('en-US')}<span className="ins-sub"> · {insight.peakShare}% من العام</span></div>
                </div>
              </aside>
            </section>
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
  --vm-bg:#ffffff; --vm-line:#e4e4e7; --vm-sidebar-w:230px;
  --vm-indigo:#4f46e5; --vm-emerald:#10b981;
}
.yt-layout{ display:flex; min-height:100vh; background:var(--vm-bg);
  color:var(--vm-ink); font-family:'Almarai',system-ui,sans-serif; line-height:1.6; }
.yt-layout a{ text-decoration:none; color:inherit; }
.yt-layout button{ font-family:inherit; cursor:pointer; }

/* Sidebar */
.yt-sidebar{ width:var(--vm-sidebar-w); background:#0B0B0B; color:#fff;
  display:flex; flex-direction:column; position:fixed; top:0; right:0; bottom:0;
  z-index:100; overflow-y:auto; transition:transform .25s ease;
  border-left:1px solid rgba(255,255,255,.06); }
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
  font-size:.88rem; font-weight:700; color:rgba(255,255,255,.65);
  transition:background .18s ease, color .18s ease;
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
  font-family:inherit; font-size:.85rem; font-weight:600; cursor:pointer; transition:.18s;
  border:1px solid var(--vm-line); background:var(--vm-paper); color:var(--vm-ink); }
.yt-btn:hover{ border-color:#a1a1aa; background:#fafafa; }
.yt-content{ flex:1; padding:32px; }
@media(max-width:960px){ .yt-content{ padding:18px; } }

/* Page heading — airy */
.page-head{ margin-bottom:28px; }
.page-head h1{ font-size:1.5rem; font-weight:800; color:var(--vm-ink); margin:0; letter-spacing:-.02em; }
.page-head p{ font-size:.85rem; color:var(--vm-muted); margin:6px 0 0; font-weight:500; }

/* Stats — flat, airy metric cards (no shadow, no hover lift) */
.sa-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; margin-bottom:28px; }
@media(max-width:900px){ .sa-stats{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:480px){ .sa-stats{ grid-template-columns:1fr; } }
.sa-stat{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; padding:24px;
  display:flex; flex-direction:column; gap:16px; }
.sa-stat-head{ display:flex; align-items:center; justify-content:space-between; }
.sa-stat-icon{ width:36px; height:36px; border-radius:10px; display:grid; place-items:center; flex:none; }
.icon-total{ background:rgba(79,70,229,.10); color:#4f46e5; }
.icon-active{ background:rgba(16,185,129,.12); color:#059669; }
.icon-pending{ background:#fef9c3; color:#a16207; }
.icon-rejected{ background:#fee2e2; color:#e11d48; }
.sa-stat-label{ font-size:.8rem; font-weight:600; color:var(--vm-muted); }
.sa-stat-val{ font-size:2rem; font-weight:700; color:var(--vm-ink); line-height:1; letter-spacing:-.03em;
  font-family:'Inter',ui-sans-serif,sans-serif; font-variant-numeric:tabular-nums lining-nums;
  font-feature-settings:'tnum' 1,'lnum' 1; align-self:flex-start; direction:ltr; }
.sa-stat-footer{ font-size:.78rem; font-weight:500; color:var(--vm-muted); margin-top:-4px; }
.sa-stat-footer.up{ color:#059669; }
.sa-stat-footer.warn{ color:#d97706; }

/* ── Master Analysis ── */
.ma{ display:grid; grid-template-columns:1fr 280px; background:var(--vm-paper);
  border:1px solid var(--vm-line); border-radius:16px; overflow:hidden; }
@media(max-width:860px){ .ma{ grid-template-columns:1fr; } }
.ma-main{ padding:24px 26px; min-width:0; }
.ma-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
.ma-head h3{ font-size:1rem; font-weight:800; color:var(--vm-ink); margin:0; letter-spacing:-.01em; }
.ma-head p{ font-size:.8rem; color:var(--vm-muted); margin:4px 0 0; font-weight:500; }
.chart-period{ display:flex; gap:4px; background:#f4f4f5; border:1px solid var(--vm-line); border-radius:9px; padding:3px; }
.cp-btn{ padding:5px 12px; border-radius:6px; font-family:inherit; font-size:.78rem; font-weight:600; border:0; background:none; color:var(--vm-muted); cursor:pointer; transition:color .18s ease, background .18s ease; }
.cp-btn.active{ background:var(--vm-paper); color:var(--vm-ink); }

/* Deep Insight panel */
.ma-side{ border-right:1px solid var(--vm-line); padding:24px; display:flex; flex-direction:column; background:#fcfcfd; }
@media(max-width:860px){ .ma-side{ border-right:0; border-top:1px solid var(--vm-line); } }
.ma-side-title{ font-size:.7rem; font-weight:700; color:var(--vm-muted); letter-spacing:.12em; text-transform:uppercase; margin-bottom:8px; }
.ins{ padding:15px 0; border-bottom:1px solid var(--vm-line); display:flex; flex-direction:column; gap:8px; }
.ins:last-child{ border-bottom:0; }
.ins-label{ font-size:.8rem; color:var(--vm-muted); font-weight:500; }
.ins-num{ font-size:1.35rem; font-weight:700; color:var(--vm-ink); line-height:1; letter-spacing:-.02em;
  font-family:'Inter',ui-sans-serif,sans-serif; font-variant-numeric:tabular-nums lining-nums; direction:ltr; align-self:flex-start; }
.ins-sub{ font-size:.74rem; font-weight:500; color:var(--vm-muted); letter-spacing:0; }
.ins-delta{ display:inline-flex; align-items:center; gap:6px; direction:ltr; align-self:flex-start; }
.ins-delta.up{ color:#059669; }
.ins-delta.down{ color:#e11d48; }
.ins-delta.up .ins-num, .ins-delta.down .ins-num{ color:inherit; }
.ins-delta span:first-child{ font-size:.85rem; }

/* Mobile sidebar overlay */
.sidebar-overlay{ display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:90; }
@media(max-width:960px){ .sidebar-overlay.open{ display:block; } }

.fade-in{ animation:fadeUp .4s ease both; }
@keyframes fadeUp{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:none; } }
`;
