// Canonical sidebar order (white-label, no "VOLD MOTOR" wordmark in nav).
// «الطلبات» أُزيلت عمداً: تسجيل الطلبات والعملاء يتم حصرياً من جهاز العامل،
// وتظهر نتائجه هنا في الرئيسية/العملاء/الفواتير تلقائياً.
export const NAV_ITEMS = [
  { href: '/dashboard',           label: 'الرئيسية',  en: 'Home',      icon: 'home' },
  { href: '/dashboard/customers', label: 'العملاء',   en: 'Customers', icon: 'users' },
  { href: '/dashboard/inventory', label: 'المخزون',   en: 'Inventory', icon: 'box' },
  { href: '/dashboard/invoices',  label: 'الفواتير',  en: 'Invoices',  icon: 'receipt' },
  { href: '/dashboard/reports',   label: 'التقارير',  en: 'Reports',   icon: 'chart' },
  { href: '/dashboard/team',      label: 'الفريق',    en: 'Team',      icon: 'users' },
  { href: '/dashboard/messages',  label: 'الرسائل',   en: 'Messages',  icon: 'chat' },
  { href: '/dashboard/settings',  label: 'الإعدادات', en: 'Settings',  icon: 'gear' },
];

// Minimal inline icon set (stroke = currentColor)
export const ICONS = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  clipboard: 'M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z M9 4h6',
  box: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  receipt: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z M8 7h8 M8 11h8 M8 15h5',
  chart: 'M3 3v18h18 M19 9l-5 5-4-4-3 3',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
};
