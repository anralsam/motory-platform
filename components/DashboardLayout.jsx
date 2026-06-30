'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BranchSwitcherDropdown from './BranchSwitcherDropdown';
import { useAuth } from './AuthProvider';

/**
 * Enterprise shell:
 *  - White-labeled sidebar (desktop) + slide-in drawer (mobile) — NO bottom nav.
 *  - Top header carries the global branch switcher; the whole app reacts to it.
 */
export default function DashboardLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const email = user?.email || '';
  const centerName = user?.user_metadata?.center_name || user?.user_metadata?.shop_name || email.split('@')[0] || 'مركزي';
  const initial = (centerName || 'م').charAt(0);

  useEffect(() => {
    function onDoc(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/signin');
    router.refresh();
  }

  // Apply the persisted theme tint app-wide on mount.
  useEffect(() => {
    try {
      const t = localStorage.getItem('vm_theme');
      document.documentElement.setAttribute('data-theme', t && t !== 'default' ? t : '');
    } catch (e) {}
  }, []);

  return (
    <div className="flex h-screen bg-[var(--app-bg)] text-slate-900">
      {/* 1. Sidebar (desktop, white-labeled) */}
      <aside className="hidden w-64 flex-col border-l border-slate-200 bg-white md:flex">
        <Sidebar />
      </aside>

      {/* Mobile drawer + overlay (replaces the bottom nav) */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 border-l border-slate-200 bg-white shadow-xl transition-transform md:hidden ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 2. Top header with branch switcher — glass (matches dashboard-pro shell) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/80 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile only) — opens the drawer */}
            <button
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
              aria-label="القائمة"
              onClick={() => setDrawerOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>

            {/* Global branch switcher */}
            <BranchSwitcherDropdown />
          </div>

          {/* User profile / notifications */}
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="الإشعارات">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full p-0.5 pe-2 transition hover:bg-slate-100"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-violet text-sm font-extrabold text-white">
                  {initial}
                </span>
                <span className="hidden text-sm font-bold text-slate-700 sm:block">{centerName}</span>
              </button>

              {menuOpen && (
                <div className="absolute end-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <div className="text-sm font-extrabold text-slate-900">{centerName}</div>
                    <div className="ltr mt-0.5 truncate text-xs text-slate-500">{email}</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
