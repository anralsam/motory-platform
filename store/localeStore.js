'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global UI locale — drives the RTL/LTR direction of the whole shell.
 * 'ar' → rtl (default) · 'en' → ltr. Persisted so the choice survives reloads.
 * (Text remains Arabic for now; this controls layout direction + alignment.)
 */
export const useLocaleStore = create(
  persist(
    (set) => ({
      lang: 'ar',
      setLang: (lang) => set({ lang: lang === 'en' ? 'en' : 'ar' }),
    }),
    { name: 'vm-locale-store' },
  ),
);

export const dirFor = (lang) => (lang === 'en' ? 'ltr' : 'rtl');
