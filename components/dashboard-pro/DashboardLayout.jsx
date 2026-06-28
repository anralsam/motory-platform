'use client';

/**
 * DashboardLayout — VOLD MOTOR System Token layout shell.
 *
 *  • Sidebar (desktop only, hidden on mobile): 240px, lucide-react icons, #f9f9f9.
 *  • BottomNavigation (mobile only): fixed bar, 4 icons, bg-white border-t.
 *  • Header: 64px, sticky, glass-morphism (backdrop-blur-md bg-white/70), with a
 *    "← العودة" button shown only when NOT on the root page.
 *  • MainContent: bg-[#f9f9f9], p-4 md:p-8, swaps by active page (no reload).
 *
 * State: a single `active` page key drives both Sidebar + BottomNav and the
 * content area. Pass `content` as a map { key: ReactNode } to render per page.
 *
 * Usage:
 *   <DashboardLayout content={{ dashboard: <Admin/>, operations: <Ops/> }} />
 */
import { useState } from 'react';
import { LayoutDashboard, Activity, Wallet, ShieldCheck, ClipboardList, ArrowLeft } from 'lucide-react';

// Pages (with their lucide icons) live in this CLIENT module — never passed from
// the server (functions can't cross the RSC boundary). The server passes only the
// `role` and a serializable `content` map keyed by page key.
const PAGES_BY_ROLE = {
  admin: [
    { key: 'dashboard', label: 'لوحة التحكم', Icon: LayoutDashboard },
    { key: 'operations', label: 'العمليات', Icon: Activity },
    { key: 'finance', label: 'المالية', Icon: Wallet },
    { key: 'governance', label: 'الحوكمة', Icon: ShieldCheck },
  ],
  merchant: [
    { key: 'dashboard', label: 'لوحة التحكم', Icon: LayoutDashboard },
    { key: 'operations', label: 'العمليات', Icon: Activity },
  ],
  worker: [
    { key: 'tasks', label: 'مهامي', Icon: ClipboardList },
  ],
};

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M6 10 L24 42 L42 10" stroke="url(#dlg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="dlg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1e293b" /><stop offset=".55" stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Placeholder({ label }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-sm font-medium text-slate-400">
      محتوى «{label}» — جاهز للربط
    </div>
  );
}

export default function DashboardLayout({ role = 'admin', content = {}, userName = 'المستخدم' }) {
  const pages = PAGES_BY_ROLE[role] || PAGES_BY_ROLE.admin;
  const [active, setActive] = useState(pages[0].key);
  const isRoot = active === pages[0].key;
  const activePage = pages.find((p) => p.key === active) || pages[0];

  const NavItem = ({ p, mobile }) => {
    const on = active === p.key;
    if (mobile) {
      return (
        <button onClick={() => setActive(p.key)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-all duration-300 ease-in-out ${on ? 'text-blue-600' : 'text-slate-500'}`}>
          <p.Icon size={22} strokeWidth={2} /><span>{p.label}</span>
        </button>
      );
    }
    return (
      <button onClick={() => setActive(p.key)}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out ${on ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
        <p.Icon size={19} strokeWidth={2} className="flex-none" /><span>{p.label}</span>
      </button>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f9f9f9] font-sans text-slate-900">
      {/* ══ Sidebar — desktop only (hidden md:flex) ══ */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-60 flex-col border-s border-slate-200 bg-[#f9f9f9] md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5" dir="ltr">
          <Logo />
          <span className="text-sm font-extrabold tracking-wide text-slate-900">VOLD <span className="text-blue-600">MOTOR</span></span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {pages.map((p) => <NavItem key={p.key} p={p} />)}
        </nav>
        <div className="flex items-center gap-3 border-t border-slate-200 p-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{(userName || 'U').charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900">{userName}</div>
            <div className="text-xs text-slate-400">VOLD MOTOR</div>
          </div>
        </div>
      </aside>

      {/* ══ Main column ══ */}
      <div className="flex min-h-screen flex-col md:me-60">
        {/* Header — glass, 64px, sticky */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            {!isRoot && (
              <button onClick={() => setActive(pages[0].key)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-300 ease-in-out hover:border-blue-600 hover:text-blue-600">
                <ArrowLeft size={16} className="rotate-180" /><span>العودة</span>
              </button>
            )}
            <h1 className="text-[15px] font-bold text-slate-900">{activePage.label}</h1>
          </div>
        </header>

        {/* MainContent — swaps by active page, no reload */}
        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {content[active] ?? <Placeholder label={activePage.label} />}
        </main>
      </div>

      {/* ══ BottomNavigation — mobile only (block md:hidden) ══ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-white md:hidden">
        {pages.map((p) => <NavItem key={p.key} p={p} mobile />)}
      </nav>
    </div>
  );
}
