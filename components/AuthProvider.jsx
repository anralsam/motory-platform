'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext({ user: null, centerId: null, role: 'owner', loading: true, signOut: async () => {} });

/**
 * Wraps the app so any client component (header, DashboardLayout, pages) can read the
 * current user. Seeded from the server (`initialUser`) to avoid a flash, then kept live
 * via Supabase's onAuthStateChange.
 */
/**
 * `centerId` and `role` are resolved SERVER-SIDE (app/dashboard/layout.jsx) from
 * the authoritative workers table and passed in. They are deliberately NOT
 * derived from `user.user_metadata`, which the client can rewrite via
 * supabase.auth.updateUser({data}) — doing so previously meant every page filter
 * (merchant_id = centerId) was built from attacker-controlled input, leaving RLS
 * as the only thing between the app and a cross-tenant read.
 * They are held as their own state, not recomputed from the refreshed auth user,
 * because the auth user carries no tenant claim.
 */
export function AuthProvider({ initialUser = null, initialCenterId = null, initialRole = 'owner', children }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data?.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ── حارس الجلسة (Session Guard) ──
     • خمول 30 دقيقة بلا أي تفاعل → خروج تلقائي وإعادة لتسجيل الدخول.
     • حد مطلق 12 ساعة منذ آخر تسجيل دخول → خروج إجباري (معيار المنصات المالية).
     يُقاس النشاط بأحداث المستخدم (نقر/كتابة/تمرير) بخنق كل 15 ثانية،
     ويُفحص عند فتح الصفحة فوراً — فإغلاق المتصفح والعودة بعد المدة يتطلب دخولاً جديداً. */
  useEffect(() => {
    if (!user) return;
    const IDLE_MS = 30 * 60 * 1000;      // 30 دقيقة خمول
    const ABS_MS = 12 * 60 * 60 * 1000;  // 12 ساعة مطلقة
    const now = Date.now();
    try {
      if (!localStorage.getItem('vm_session_start')) localStorage.setItem('vm_session_start', String(now));
      if (!localStorage.getItem('vm_last_active')) localStorage.setItem('vm_last_active', String(now));
    } catch {}

    async function expire() {
      try { localStorage.removeItem('vm_session_start'); localStorage.removeItem('vm_last_active'); } catch {}
      await supabase.auth.signOut();
      setUser(null);
      window.location.href = '/auth/signin?expired=1';
    }

    function check() {
      try {
        const last = Number(localStorage.getItem('vm_last_active')) || now;
        const start = Number(localStorage.getItem('vm_session_start')) || now;
        if (Date.now() - last > IDLE_MS || Date.now() - start > ABS_MS) expire();
      } catch {}
    }

    let lastMark = 0;
    function markActive() {
      const t = Date.now();
      if (t - lastMark < 15000) return; // خنق الكتابة كل 15 ث
      lastMark = t;
      try { localStorage.setItem('vm_last_active', String(t)); } catch {}
    }

    check(); // فحص فوري عند فتح/العودة للصفحة
    const iv = setInterval(check, 60 * 1000);
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(iv);
      events.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user]);

  async function signOut() {
    try { localStorage.removeItem('vm_session_start'); localStorage.removeItem('vm_last_active'); } catch {}
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, centerId: initialCenterId || user?.id || null, role: initialRole, loading, signOut }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
