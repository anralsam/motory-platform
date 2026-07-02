'use client';
/* i18n خفيف للوحة المراكز — قاموس واحد + hook.
   الافتراضي عربي في كل جلسة؛ EN يترجم الهيكل والعناوين والعناصر الرئيسية. */
import { useLocaleStore } from '@/store/localeStore';

const DICT = {
  // عناوين الصفحات وأوصافها
  'الرئيسية': 'Home',
  'العملاء': 'Customers',
  'المخزون': 'Inventory',
  'الفواتير': 'Invoices',
  'التقارير': 'Reports',
  'الفريق': 'Team',
  'الرسائل': 'Messages',
  'الإعدادات': 'Settings',
  'إدارة الفريق': 'Team Management',
  'كل الفروع': 'All branches',
  // أزرار وعناصر شائعة
  'إضافة موظف': 'Add employee',
  'إضافة صنف': 'Add item',
  'بحث': 'Search',
  'الكل': 'All',
  'الفنّيون': 'Technicians',
  'المشرفون': 'Supervisors',
  'بالاسم أو الجوال': 'Name or mobile',
  'إجمالي الفريق': 'Total team',
  'نشطون الآن': 'Active now',
  'فنّيون': 'Technicians',
  'مشرفون': 'Supervisors',
  'الاسم': 'Name',
  'المنصب': 'Role',
  'رقم الجوال': 'Mobile',
  'حالة الحساب': 'Status',
  'الإجراءات': 'Actions',
  'لا يوجد موظفون في هذا الفرع بعد': 'No employees in this branch yet',
  '+ إضافة أول موظف': '+ Add first employee',
  'فاتورة': 'invoices',
  'عملية': 'operations',
  'المتابعة الحية': 'Live Monitor',
  'نظرة عامة': 'Overview',
  'تحليل الفريق': 'Team Analytics',
  'التحليل الذكي': 'AI Insights',
  'سجل العمليات': 'Operations Log',
};

export function useT() {
  const lang = useLocaleStore((s) => s.lang);
  const isEn = lang === 'en';
  const t = (ar, en) => (isEn ? (en ?? DICT[ar] ?? ar) : ar);
  return { t, isEn, lang };
}
