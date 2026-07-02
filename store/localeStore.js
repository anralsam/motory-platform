'use client';
import { create } from 'zustand';

/**
 * لغة اللوحة — في الذاكرة فقط: كل جلسة تفتح بالعربية دائماً.
 * (النسخة السابقة كانت تحفظ الاختيار، وبقايا المفتاح القديم في متصفحات
 *  المستخدمين كانت تفتح اللوحة بالإنجليزية — نطهّره هنا نهائياً.)
 */
try { if (typeof window !== 'undefined') localStorage.removeItem('vm-locale-store'); } catch {}

export const useLocaleStore = create((set) => ({
  lang: 'ar',
  setLang: (lang) => set({ lang: lang === 'en' ? 'en' : 'ar' }),
}));

export const dirFor = (lang) => (lang === 'en' ? 'ltr' : 'rtl');
