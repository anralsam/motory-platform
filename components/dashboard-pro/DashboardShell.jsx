'use client';

/**
 * DashboardShell — VOLD MOTOR Layout Shell (System Token).
 *   • Sidebar: collapsible (72px ↔ 240px) on desktop, Lucide icons. Hidden on
 *     mobile — replaced by a fixed bottom navigation (YouTube style).
 *   • Header: glass-morphism (bg-white/70 backdrop-blur-md) + "← العودة" home button.
 *   • RTL by default; structure is dir-agnostic (logical utilities) so the EN
 *     toggle flips everything cleanly.
 *   • Main container: p-4 md:p-8 breathing room. Primary #2563eb (blue-600).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Activity, Wallet, ShieldCheck, Calendar, Settings,
  ClipboardList, Package, User, LogOut, Globe, ArrowLeft, PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const NAV_BY_ROLE = {
  admin: [
    { k: 'dashboard', label: 'Dashboard', ar: 'لوحة التحكم', Icon: LayoutDashboard },
    { k: 'operations', label: 'Operations', ar: 'العمليات', Icon: Activity },
    { k: 'finance', label: 'Finance', ar: 'المالية', Icon: Wallet },
    { k: 'governance', label: 'Governance', ar: 'الحوكمة', Icon: ShieldCheck },
  ],
  merchant: [
    { k: 'dashboard', label: 'Dashboard', ar: 'لوحة التحكم', Icon: LayoutDashboard },
    { k: 'bookings', label: 'Bookings', ar: 'الحجوزات', Icon: Calendar },
    { k: 'finance', label: 'Finance', ar: 'المالية', Icon: Wallet },
    { k: 'settings', label: 'Settings', ar: 'الإعدادات', Icon: Settings },
  ],
  worker: [
    { k: 'tasks', label: 'Tasks', ar: 'المهام', Icon: ClipboardList },
    { k: 'inventory', label: 'Inventory', ar: 'المخزون', Icon: Package },
    { k: 'profile', label: 'Profile', ar: 'حسابي', Icon: User },
  ],
};
const ROLE_LABEL = { admin: 'Super Admin', merchant: 'صاحب مركز', worker: 'فني' };

export default function DashboardShell({ role = 'admin', userName = 'المستخدم', children }) {
  const router = useRouter();
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin;
  const [active, setActive] = useState(nav[0].k);
  const [collapsed, setCollapsed] = useState(false);
  const [dir, setDir] = useState('rtl');
  const isAr = dir === 'rtl';
  const labelOf = (n) => (isAr ? n.ar : n.label);

  function toggleDir() {
    const next = dir === 'rtl' ? 'ltr' : 'rtl';
    setDir(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', next);
      document.documentElement.setAttribute('lang', next === 'rtl' ? 'ar' : 'en');
    }
  }
  async function logout() { await supabase.auth.signOut(); router.replace('/auth/signin'); }

  const sideW = collapsed ? 'w-[72px]' : 'w-60';
  const mainPad = collapsed ? 'lg:me-[72px]' : 'lg:me-60';
  const activeNav = nav.find((n) => n.k === active) || nav[0];

  return (
    <div className="min-h-screen bg-[#f9f9f9] font-sans text-slate-900">
      {/* ══ Desktop sidebar — collapsible (hidden on mobile) ══ */}
      <aside className={`fixed inset-y-0 end-0 z-40 hidden flex-col border-s border-slate-200 bg-[#0B0B0B] text-white transition-all duration-300 ease-in-out lg:flex ${sideW}`}>
        <div className={`flex h-16 items-center border-b border-white/10 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5" dir="ltr">
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M6 10 L24 42 L42 10" stroke="url(#sg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
                <defs><linearGradient id="sg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse"><stop stopColor="#FAFAFA" /><stop offset=".55" stopColor="#3b82f6" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs>
              </svg>
              <span className="text-sm font-extrabold tracking-wide">VOLD <span className="text-blue-400">MOTOR</span></span>
            </div>
          )}
          <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'توسيع' : 'طيّ'}
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white">
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((n) => {
            const on = active === n.k;
            return (
              <button key={n.k} onClick={() => setActive(n.k)} title={labelOf(n)}
                className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ease-in-out ${collapsed ? 'justify-center px-0' : 'px-3'} ${on ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/[0.07] hover:text-white'}`}>
                <n.Icon size={19} strokeWidth={2} className="flex-none" />
                {!collapsed && <span className="truncate">{labelOf(n)}</span>}
              </button>
            );
          })}
        </nav>

        <div className={`flex items-center gap-3 border-t border-white/10 p-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-blue-600 text-sm font-black">{(userName || 'U').charAt(0).toUpperCase()}</div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{userName}</div>
                <div className="text-xs text-white/45">{ROLE_LABEL[role]}</div>
              </div>
              <button onClick={logout} title="خروج" className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/50 transition-all duration-300 hover:border-blue-400 hover:text-blue-400">
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ══ Main ══ */}
      <div className={`flex min-h-screen flex-col transition-all duration-300 ease-in-out ${mainPad}`}>
        {/* Glass header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/70 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <a href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-300 hover:border-blue-600 hover:text-blue-600">
              <ArrowLeft size={16} className={isAr ? 'rotate-180' : ''} />
              <span>العودة</span>
            </a>
            <div className="text-[15px] font-bold text-slate-900">{labelOf(activeNav)}</div>
          </div>
          <button onClick={toggleDir} title="تبديل اللغة / الاتجاه" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-300 hover:border-blue-600 hover:text-blue-600">
            <Globe size={16} /><span className="tabular-nums">{isAr ? 'AR' : 'EN'}</span>
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 lg:pb-8">{children}</main>
      </div>

      {/* ══ Mobile bottom navigation (no sidebar on mobile) ══ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-white lg:hidden">
        {nav.map((n) => {
          const on = active === n.k;
          return (
            <button key={n.k} onClick={() => setActive(n.k)} className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-all duration-300 ${on ? 'text-blue-600' : 'text-slate-500'}`}>
              <n.Icon size={22} strokeWidth={2} /><span>{labelOf(n)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
