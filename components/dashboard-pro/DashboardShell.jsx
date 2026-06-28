'use client';

/**
 * DashboardShell — YouTube-Studio-Light chrome for /dashboard-pro.
 * - Desktop: fixed #0B0B0B sidebar + flexible main area.
 * - Mobile : sidebar hidden, replaced by a fixed bottom navigation bar.
 * - i18n   : a dir toggle flips document.documentElement.dir between rtl/ltr and
 *            swaps the font family. Tailwind logical utilities (text-start/end,
 *            ms-/me-, ps-/pe-) follow `dir` automatically, so alignment is global.
 *
 * Pure Tailwind. Receives role + user from the Server Component and renders the
 * passed `children` module in the content area.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const I = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Icons = {
  grid: (p) => (<svg {...I} {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
  store: (p) => (<svg {...I} {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>),
  calendar: (p) => (<svg {...I} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  box: (p) => (<svg {...I} {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>),
  list: (p) => (<svg {...I} {...p}><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>),
  user: (p) => (<svg {...I} {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  settings: (p) => (<svg {...I} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
  logout: (p) => (<svg {...I} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  globe: (p) => (<svg {...I} {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>),
};

const NAV_BY_ROLE = {
  admin: [
    { k: 'overview', label: 'لوحة التحكم', icon: 'grid' },
    { k: 'merchants', label: 'المراكز', icon: 'store' },
    { k: 'settings', label: 'الإعدادات', icon: 'settings' },
  ],
  merchant: [
    { k: 'overview', label: 'لوحة التحكم', icon: 'grid' },
    { k: 'bookings', label: 'الحجوزات', icon: 'calendar' },
    { k: 'settings', label: 'الإعدادات', icon: 'settings' },
  ],
  worker: [
    { k: 'tasks', label: 'المهام', icon: 'list' },
    { k: 'inventory', label: 'المخزون', icon: 'box' },
    { k: 'profile', label: 'حسابي', icon: 'user' },
  ],
};

const ROLE_LABEL = { admin: 'Super Admin', merchant: 'صاحب مركز', worker: 'فني' };

export default function DashboardShell({ role = 'admin', userName = 'المستخدم', children }) {
  const router = useRouter();
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin;
  const [active, setActive] = useState(nav[0].k);
  const [dir, setDir] = useState('rtl');

  function toggleDir() {
    const next = dir === 'rtl' ? 'ltr' : 'rtl';
    setDir(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', next);
      document.documentElement.setAttribute('lang', next === 'rtl' ? 'ar' : 'en');
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] font-sans text-slate-900">
      {/* ══ Desktop sidebar (hidden on mobile) ══ */}
      <aside className="fixed inset-y-0 end-0 z-40 hidden w-64 flex-col bg-[#0B0B0B] text-white lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5" dir="ltr">
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M6 10 L24 42 L42 10" stroke="url(#sg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="sg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse"><stop stopColor="#FAFAFA" /><stop offset=".55" stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-extrabold tracking-wide">VOLD <span className="text-blue-400">MOTOR</span></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{ROLE_LABEL[role]}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {nav.map((n) => {
            const on = active === n.k;
            const Ico = Icons[n.icon];
            return (
              <button key={n.k} onClick={() => setActive(n.k)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm font-bold transition-colors duration-150 ${on ? 'bg-blue-600/20 text-white' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`}>
                {on && <span className="absolute inset-y-1.5 end-0 w-[3px] rounded-s bg-blue-500" />}
                <Ico width="18" height="18" /><span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-black">{(userName || 'U').charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{userName}</div>
            <div className="text-xs text-white/45">{ROLE_LABEL[role]}</div>
          </div>
          <button onClick={logout} title="خروج" className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/50 transition-colors hover:border-blue-400 hover:text-blue-400">
            <Icons.logout width="15" height="15" />
          </button>
        </div>
      </aside>

      {/* ══ Main ══ */}
      <div className="flex min-h-screen flex-col lg:me-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8">
          <div className="text-[15px] font-extrabold">{(nav.find((n) => n.k === active) || nav[0]).label}</div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDir} title="تبديل اللغة / الاتجاه" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-600 hover:text-blue-600">
              <Icons.globe width="16" height="16" />
              <span className="tabular-nums">{dir === 'rtl' ? 'AR' : 'EN'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-5 p-5 pb-24 lg:p-8 lg:pb-8">{children}</main>
      </div>

      {/* ══ Mobile bottom navigation (hidden on desktop) ══ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-white lg:hidden">
        {nav.map((n) => {
          const on = active === n.k;
          const Ico = Icons[n.icon];
          return (
            <button key={n.k} onClick={() => setActive(n.k)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${on ? 'text-blue-600' : 'text-slate-500'}`}>
              <Ico width="22" height="22" /><span>{n.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
