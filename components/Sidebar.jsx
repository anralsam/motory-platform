'use client';

/**
 * Sidebar — compact YouTube-Studio-style rail.
 *  • Slim (w-56 shell), tight items, clean lucide icons — no hand-drawn SVGs.
 *  • Header: TEXT ONLY — «كل الفروع» or the selected branch name. No avatar,
 *    no logo block (the brand identity lives on the landing/receipts instead).
 *  • Active item: quiet slate tint, not a loud blue pill.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, Package, ReceiptText, BarChart3, UsersRound, MessageSquare, Settings, Building2, Wallet,
} from 'lucide-react';
import { NAV_ITEMS } from './nav';
import { usePermissions } from '@/lib/usePermissions';
import { useSelectedBranch } from '@/store/branchStore';
import { useLocaleStore } from '@/store/localeStore';

// href → professional lucide icon (single source; nav.js stays data-only).
const ICON_BY_HREF = {
  '/dashboard/expenses': Wallet,
  '/dashboard': Home,
  '/dashboard/customers': Users,
  '/dashboard/inventory': Package,
  '/dashboard/invoices': ReceiptText,
  '/dashboard/reports': BarChart3,
  '/dashboard/team': UsersRound,
  '/dashboard/messages': MessageSquare,
  '/dashboard/settings': Settings,
};

export default function Sidebar({ onNavigate }) {
  const pathname = usePathname();
  // Least privilege: financial nav entries are dropped entirely for staff whose
  // can_view_financials flag is OFF — they never see the door, and the route
  // behind it still answers with Forbidden403 if reached directly.
  const { canViewFinancials } = usePermissions();
  const branch = useSelectedBranch();
  const lang = useLocaleStore((s) => s.lang);
  const isEn = lang === 'en';
  const isAll = !branch || branch.id === 'all';
  const scopeName = isAll ? (isEn ? 'All branches' : 'كل الفروع') : branch.name;

  return (
    <div className="flex h-full flex-col">
      {/* Scope header — text only, no image */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <Building2 size={15} className="flex-none text-slate-400" />
        <span className="truncate text-[13px] font-bold text-slate-800">{scopeName}</span>
      </div>

      {/* Canonical nav — compact */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5 no-scrollbar">
        {NAV_ITEMS.filter((item) => !item.financial || canViewFinancials).map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = ICON_BY_HREF[item.href] || Home;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active ? 'bg-slate-100 font-bold text-slate-900' : 'font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.3 : 2} className="flex-none" />
              <span>{isEn ? (item.en || item.label) : item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 text-center text-[10px] font-semibold text-slate-300">
        {isEn ? 'Powered by VOLD MOTOR' : 'مدعوم بواسطة VOLD MOTOR'}
      </div>
    </div>
  );
}
