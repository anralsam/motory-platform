/**
 * VOLD MOTOR — Dashboard Pro route-level loading skeleton.
 * Next.js App Router automatically wraps page.jsx in a <Suspense> boundary and
 * renders this while the segment loads, so the UI never flashes blank.
 * Mirrors the real Bento layout (fixed dark sidebar + topbar + hero + 4 stat
 * cards + 2 chart cards). Pure presentational — no client JS, styles inline.
 */
export default function DashboardProLoading() {
  return (
    <div dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="sk-layout">
        {/* Sidebar */}
        <aside className="sk-sidebar">
          <div className="sk-side-logo">
            <span className="sk-box" style={{ width: 28, height: 28, borderRadius: 8 }} />
            <span className="sk-line" style={{ width: 96, height: 12 }} />
          </div>
          <div className="sk-side-nav">
            {[0, 1, 2].map((i) => (
              <div className="sk-nav-item" key={i}>
                <span className="sk-box" style={{ width: 16, height: 16, borderRadius: 4 }} />
                <span className="sk-line" style={{ width: 84, height: 10 }} />
              </div>
            ))}
          </div>
          <div className="sk-side-user">
            <span className="sk-box" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <span className="sk-line" style={{ width: 70, height: 10 }} />
          </div>
        </aside>

        {/* Main */}
        <div className="sk-main">
          {/* Topbar */}
          <header className="sk-topbar">
            <div>
              <span className="sk-line" style={{ width: 130, height: 14, marginBottom: 8 }} />
              <span className="sk-line" style={{ width: 90, height: 9 }} />
            </div>
            <span className="sk-box" style={{ width: 110, height: 36, borderRadius: 10 }} />
          </header>

          {/* Content */}
          <main className="sk-content">
            {/* Hero */}
            <div className="sk-hero shimmer" />

            {/* 4 stat cards */}
            <div className="sk-stats">
              {[0, 1, 2, 3].map((i) => (
                <div className="sk-card sk-stat" key={i}>
                  <div className="sk-stat-head">
                    <span className="sk-line" style={{ width: 88, height: 10 }} />
                    <span className="sk-box" style={{ width: 38, height: 38, borderRadius: 11 }} />
                  </div>
                  <span className="sk-line" style={{ width: 70, height: 26, marginTop: 6 }} />
                  <span className="sk-line" style={{ width: 100, height: 9, marginTop: 10 }} />
                </div>
              ))}
            </div>

            {/* 2 chart cards */}
            <div className="sk-charts">
              {[0, 1].map((i) => (
                <div className="sk-card sk-chart" key={i}>
                  <div className="sk-stat-head" style={{ marginBottom: 18 }}>
                    <div>
                      <span className="sk-line" style={{ width: 120, height: 12 }} />
                      <span className="sk-line" style={{ width: 160, height: 9, marginTop: 8 }} />
                    </div>
                    <span className="sk-box" style={{ width: 90, height: 28, borderRadius: 9 }} />
                  </div>
                  <div className="sk-chart-body shimmer" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.sk-layout, .sk-layout *, .sk-layout *::before, .sk-layout *::after { box-sizing:border-box; }
.sk-layout{ display:flex; min-height:100vh; background:#f4f4f5; font-family:'Almarai',system-ui,sans-serif; }

/* shimmer primitives */
.sk-box, .sk-line{ display:inline-block; background:#e9eaec; border-radius:6px; position:relative; overflow:hidden; }
.sk-sidebar .sk-box, .sk-sidebar .sk-line{ background:rgba(255,255,255,.10); }
.shimmer, .sk-box, .sk-line{ background-image:linear-gradient(90deg, transparent 0, rgba(255,255,255,.55) 50%, transparent 100%);
  background-size:200% 100%; background-repeat:no-repeat; animation:sk-shimmer 1.25s ease-in-out infinite; }
.sk-sidebar .sk-box, .sk-sidebar .sk-line{ background-image:linear-gradient(90deg, transparent 0, rgba(255,255,255,.14) 50%, transparent 100%); }
@keyframes sk-shimmer{ 0%{ background-position:120% 0; } 100%{ background-position:-120% 0; } }

/* Sidebar (fixed, right, dark) */
.sk-sidebar{ width:230px; background:#0B0B0B; position:fixed; top:0; right:0; bottom:0; z-index:100;
  display:flex; flex-direction:column; border-left:1px solid rgba(255,255,255,.06); }
.sk-side-logo{ display:flex; align-items:center; gap:10px; padding:20px 18px 16px; border-bottom:1px solid rgba(255,255,255,.08); direction:ltr; }
.sk-side-nav{ flex:1; padding:18px 0; display:flex; flex-direction:column; gap:6px; }
.sk-nav-item{ display:flex; align-items:center; gap:11px; padding:10px 18px; }
.sk-side-user{ padding:16px 18px; border-top:1px solid rgba(255,255,255,.08); display:flex; align-items:center; gap:10px; }

/* Main */
.sk-main{ flex:1; margin-right:230px; display:flex; flex-direction:column; min-height:100vh; }
@media(max-width:960px){ .sk-main{ margin-right:0; } }
.sk-topbar{ background:#fff; border-bottom:1px solid #e5e7eb; height:64px; padding:0 24px; display:flex; align-items:center; justify-content:space-between; }
.sk-content{ flex:1; padding:28px; }
@media(max-width:960px){ .sk-content{ padding:16px; } }

/* Hero */
.sk-hero{ height:118px; border-radius:20px; margin-bottom:24px; background:#e9eaec; }

/* Cards */
.sk-card{ background:#fff; border:1px solid #e4e4e7; border-radius:16px; box-shadow:0 1px 2px rgba(24,24,27,.04),0 2px 8px rgba(24,24,27,.06); }
.sk-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
@media(max-width:900px){ .sk-stats{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:480px){ .sk-stats{ grid-template-columns:1fr; } }
.sk-stat{ padding:20px; display:flex; flex-direction:column; }
.sk-stat-head{ display:flex; align-items:flex-start; justify-content:space-between; }

.sk-charts{ display:grid; grid-template-columns:1fr 1fr; gap:20px; }
@media(max-width:860px){ .sk-charts{ grid-template-columns:1fr; } }
.sk-chart{ padding:22px; }
.sk-chart-body{ height:180px; border-radius:12px; background:#eef0f2; }
`;
