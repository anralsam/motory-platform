'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, ICONS } from './nav';
import { useSelectedBranch } from '@/store/branchStore';

function NavIcon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : 'M' + seg)} />
      ))}
    </svg>
  );
}

/**
 * White-labeled sidebar. The logo + center name come from the *selected branch*
 * (global switcher), falling back to a default icon. No hardcoded VOLD wordmark.
 */
export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  const branch = useSelectedBranch();
  const isAll = !branch || branch.id === 'all';
  const centerName = isAll ? 'كل الفروع' : branch.name;

  // Custom logo: branch logo_url, else the uploaded logo (instant via localStorage + event).
  const [customLogo, setCustomLogo] = useState(null);
  useEffect(() => {
    try { setCustomLogo(localStorage.getItem('vm_logo')); } catch (e) {}
    const h = (e) => setCustomLogo(e.detail?.url || (() => { try { return localStorage.getItem('vm_logo'); } catch (_) { return null; } })());
    window.addEventListener('vm:logo-change', h);
    return () => window.removeEventListener('vm:logo-change', h);
  }, []);
  const logo = (branch && branch.logo_url) || customLogo || null;

  return (
    <div className="flex h-full flex-col">
      {/* White-label header */}
      <div className="flex flex-col items-center gap-2 border-b border-slate-200 p-4">
        {logo ? (
          <img src={logo} alt={centerName} className="h-10 max-w-[150px] object-contain" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-violet text-lg font-extrabold text-white">
            {(centerName || 'م').charAt(0)}
          </div>
        )}
        <span className="text-sm font-extrabold text-slate-700">{centerName}</span>
      </div>

      {/* Canonical nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${
                active ? 'bg-brand/10 text-brand' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 text-center text-[11px] font-semibold text-slate-400">
        مدعوم بواسطة VOLD MOTOR
      </div>
    </div>
  );
}
