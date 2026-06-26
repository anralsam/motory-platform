'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { SUPABASE_URL } from '@/lib/supabase/config';

const EDGE = `${SUPABASE_URL}/functions/v1`;

const STATUS_LABEL = { pending: 'معلّق', approved: 'مفعّل', rejected: 'مرفوض', locked: 'مقفول' };
const TABLE_TITLES = {
  all: 'جميع الطلبات',
  pending: 'الطلبات المعلّقة',
  approved: 'المراكز المفعّلة',
  rejected: 'الطلبات المرفوضة',
  locked: 'حسابات مقفولة (تجاوز محاولات الدخول)',
};
const MONTH_LABELS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function esc(s) {
  return s == null ? '' : String(s);
}
function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [adminName, setAdminName] = useState('المدير');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, locked: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [toast, setToast] = useState(null); // { msg, type }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [growthPeriod, setGrowthPeriod] = useState('month');
  const [today, setToday] = useState('VOLD MOTOR Platform');

  // ── Localized date in topbar ──
  useEffect(() => {
    const now = new Date();
    setToday(`${DAY_NAMES[now.getDay()]}، ${now.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ── API helper ──
  const adminCall = useCallback(
    async (body, tkn) => {
      const t = tkn || token;
      const res = await fetch(`${EDGE}/admin-merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'خطأ في الخادم');
      return json;
    },
    [token],
  );

  const loadAll = useCallback(
    async (tkn) => {
      setLoading(true);
      setError('');
      try {
        const [listRes, statsRes] = await Promise.all([
          adminCall({ action: 'list', status: 'all' }, tkn),
          adminCall({ action: 'stats' }, tkn),
        ]);
        setMerchants(listRes.merchants || []);
        setStats({
          pending: statsRes.pending ?? 0,
          approved: statsRes.approved ?? 0,
          rejected: statsRes.rejected ?? 0,
          locked: statsRes.locked ?? 0,
          total: statsRes.total ?? 0,
        });
      } catch (e) {
        setError(e.message || 'تعذّر تحميل البيانات');
      } finally {
        setLoading(false);
      }
    },
    [adminCall],
  );

  // ── Boot ──
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (!session) {
        router.replace('/auth/signin?redirect=/vm-control-center');
        return;
      }
      const t = session.access_token;
      const email = session.user?.email || '';
      setToken(t);
      setAdminName(email.split('@')[0] || 'المدير');
      await loadAll(t);
    })();
    return () => {
      active = false;
    };
  }, [router, loadAll]);

  // ── Esc closes sidebar + modal ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setRejectId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Derived: filtered + searched list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filter === 'all' ? merchants : merchants.filter((m) => m.status === filter);
    if (q) {
      list = list.filter(
        (m) =>
          (m.shop_name || '').toLowerCase().includes(q) ||
          (m.owner_name || '').toLowerCase().includes(q) ||
          (m.phone || '').includes(q) ||
          (m.email || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [merchants, filter, search]);

  // ── Chart data ──
  const growthData = useMemo(() => {
    const counts = Array(12).fill(0);
    merchants.forEach((m) => {
      if (!m.created_at) return;
      const d = new Date(m.created_at).getMonth();
      counts[d]++;
    });
    return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
  }, [merchants]);

  const donutData = useMemo(
    () => [
      { name: 'مفعّل', value: stats.approved, color: '#16a34a' },
      { name: 'انتظار', value: stats.pending, color: '#ca8a04' },
      { name: 'مرفوض', value: stats.rejected, color: '#dc2626' },
      { name: 'مقفول', value: stats.locked || 0, color: '#a21caf' },
    ],
    [stats],
  );
  const donutTotal = stats.approved + stats.pending + stats.rejected + (stats.locked || 0);

  // ── Actions ──
  async function doApprove(id) {
    setBusyId(id);
    try {
      await adminCall({ action: 'approve', id });
      showToast('تم قبول المركز وإرسال إيميل الترحيب');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectId) return;
    const id = rejectId;
    setBusyId(id);
    try {
      await adminCall({ action: 'reject', id, notes: rejectNotes.trim() });
      setRejectId(null);
      setRejectNotes('');
      showToast('تم رفض الطلب');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function doSuspend(id) {
    setBusyId(id);
    try {
      await adminCall({ action: 'suspend', id });
      showToast('تم إيقاف تفعيل المركز');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function doUnlock(id) {
    setBusyId(id);
    try {
      await adminCall({ action: 'unlock', id });
      showToast('تم فك القفل وإعادة تفعيل الحساب');
      await loadAll();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/auth/signin');
  }

  const pickFilter = (f) => {
    setFilter(f);
    setSidebarOpen(false);
  };

  const avatarChar = (adminName || 'A').charAt(0).toUpperCase();

  return (
    <div dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Sidebar overlay (mobile) */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="yt-layout">
        {/* ══ SIDEBAR ══ */}
        <aside className={`yt-sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="yt-sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M6 10 L24 42 L42 10" stroke="url(#adsbg)" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="adsbg" x1="6" y1="10" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FAFAFA" />
                  <stop offset=".55" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <div className="yt-logo-text">
              <span className="yt-logo-name">
                VOLD <span>MOTOR</span>
              </span>
              <span className="yt-logo-sub">Super Admin</span>
            </div>
          </div>

          <nav className="yt-sidebar-nav">
            <div className="yt-nav-section">
              <div className="yt-nav-label">الرئيسية</div>
              <button className={`yt-nav-item${filter === 'all' ? ' active' : ''}`} onClick={() => pickFilter('all')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                <span>نظرة عامة</span>
              </button>
              <button className={`yt-nav-item${filter === 'pending' ? ' active' : ''}`} onClick={() => pickFilter('pending')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span>طلبات الانضمام</span>
                <span className="yt-nav-badge">{stats.pending}</span>
              </button>
            </div>
            <div className="yt-nav-section">
              <div className="yt-nav-label">المنصة</div>
              <button className={`yt-nav-item${filter === 'approved' ? ' active' : ''}`} onClick={() => pickFilter('approved')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>المراكز المشتركة</span>
              </button>
              <button className="yt-nav-item" onClick={() => pickFilter('all')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <span>إحصائيات المنصة</span>
              </button>
              <button className={`yt-nav-item${filter === 'rejected' ? ' active' : ''}`} onClick={() => pickFilter('rejected')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span>الطلبات المرفوضة</span>
              </button>
            </div>
            <div className="yt-nav-section">
              <div className="yt-nav-label">الإعدادات</div>
              <a href="/dashboard/settings" className="yt-nav-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>الإعدادات</span>
              </a>
            </div>
          </nav>

          <div className="yt-sidebar-user">
            <div className="yt-su-avatar">{avatarChar}</div>
            <div className="yt-su-info">
              <div className="yt-su-name">{adminName}</div>
              <div className="yt-su-role">Super Admin</div>
            </div>
            <button className="yt-su-logout" onClick={logout} title="تسجيل خروج">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <div className="yt-main">
          {/* Topbar */}
          <header className="yt-topbar">
            <div className="yt-topbar-left">
              <button className="burger-btn" onClick={() => setSidebarOpen(true)} aria-label="القائمة">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <a href="/" className="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>الرئيسية</span>
              </a>
              <div>
                <div className="yt-page-title">لوحة الإدارة العليا</div>
                <div className="yt-page-sub">{today}</div>
              </div>
            </div>
            <div className="yt-topbar-right">
              <button onClick={() => loadAll()} className="yt-btn yt-btn-ghost" style={{ padding: '7px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>تحديث</span>
              </button>
              <button onClick={logout} className="yt-btn yt-btn-ghost" style={{ padding: '7px 12px' }} title="خروج">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="yt-content">
            {/* Revenue Hero */}
            <div className="rev-hero fade-in">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="rh-label">إجمالي دخل المنصة · هذا الشهر</div>
                <div className="rh-val">—</div>
                <div className="rh-change">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  </svg>
                  <span>قيد التطوير — سيُعرض قريباً</span>
                </div>
              </div>
              <div className="rh-actions">
                <button className="rh-btn rh-btn-primary" onClick={() => loadAll()}>
                  تحديث الآن
                </button>
                <button className="rh-btn rh-btn-ghost">عرض التقرير</button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="sa-stats fade-in" style={{ animationDelay: '.06s' }}>
              {/* إجمالي */}
              <div className="sa-stat">
                <div className="sa-stat-head">
                  <div>
                    <div className="sa-stat-label">إجمالي الطلبات</div>
                  </div>
                  <div className="sa-stat-icon icon-total">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                </div>
                <div className="sa-stat-val">{loading ? '—' : stats.total}</div>
                <div className="sa-stat-footer up">منذ الإطلاق</div>
              </div>

              {/* معلّق */}
              <div className="sa-stat">
                <div className="sa-stat-head">
                  <div>
                    <div className="sa-stat-label">طلبات معلّقة</div>
                  </div>
                  <div className="sa-stat-icon icon-pending">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <div className="sa-stat-val">{loading ? '—' : stats.pending}</div>
                <div className="sa-stat-footer warn">⚠ تحتاج مراجعة</div>
              </div>

              {/* مفعّلة */}
              <div className="sa-stat">
                <div className="sa-stat-head">
                  <div>
                    <div className="sa-stat-label">مراكز مفعّلة</div>
                  </div>
                  <div className="sa-stat-icon icon-approved">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                </div>
                <div className="sa-stat-val">{loading ? '—' : stats.approved}</div>
                <div className="shop-breakdown">
                  <div className="sh-type">
                    <span className="sh-type-dot" style={{ background: '#3b82f6' }} />
                    <span className="sh-type-name">مراكز عناية</span>
                    <span className="sh-type-count">—</span>
                  </div>
                  <div className="sh-type">
                    <span className="sh-type-dot" style={{ background: '#16a34a' }} />
                    <span className="sh-type-name">ورش ميكانيكا</span>
                    <span className="sh-type-count">—</span>
                  </div>
                  <div className="sh-type">
                    <span className="sh-type-dot" style={{ background: '#d97706' }} />
                    <span className="sh-type-name">مراكز تظليل</span>
                    <span className="sh-type-count">—</span>
                  </div>
                </div>
              </div>

              {/* مرفوضة */}
              <div className="sa-stat">
                <div className="sa-stat-head">
                  <div>
                    <div className="sa-stat-label">طلبات مرفوضة</div>
                  </div>
                  <div className="sa-stat-icon icon-rejected">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                </div>
                <div className="sa-stat-val">{loading ? '—' : stats.rejected}</div>
                <div className="sa-stat-footer">من إجمالي الطلبات</div>
              </div>
            </div>

            {/* Charts row */}
            <div className="charts-row fade-in" style={{ animationDelay: '.12s' }}>
              {/* Monthly growth bar chart */}
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>نمو الانضمامات الشهري</h3>
                    <p>عدد طلبات الانضمام الجديدة لهذا العام</p>
                  </div>
                  <div className="chart-period">
                    <button className={`cp-btn${growthPeriod === 'month' ? ' active' : ''}`} onClick={() => setGrowthPeriod('month')}>
                      شهري
                    </button>
                    <button className={`cp-btn${growthPeriod === 'year' ? ' active' : ''}`} onClick={() => setGrowthPeriod('year')}>
                      سنوي
                    </button>
                  </div>
                </div>
                <div style={{ height: 180, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={28} />
                      <Tooltip
                        cursor={{ fill: 'rgba(37,99,235,.06)' }}
                        contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit' }}
                        labelStyle={{ fontWeight: 700 }}
                        formatter={(v) => [v, 'طلبات جديدة']}
                      />
                      <Bar dataKey="value" fill="rgba(37,99,235,.15)" stroke="#2563eb" strokeWidth={2} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status donut chart */}
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>توزيع حالات الطلبات</h3>
                    <p>نسبة القبول والرفض والانتظار</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ width: 140, height: 140, flex: 'none', position: 'relative' }}>
                    {donutTotal > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius="70%"
                            outerRadius="100%"
                            paddingAngle={2}
                            stroke="#fff"
                            strokeWidth={3}
                          >
                            {donutData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'inherit' }}
                            formatter={(v, n) => [v, n]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#9ca3af', fontSize: '.8rem' }}>—</div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#15803d', flex: 'none' }} />
                      <span style={{ fontSize: '.85rem', color: 'var(--vm-muted)' }}>مفعّل</span>
                      <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--vm-ink)', marginRight: 'auto' }}>{stats.approved}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#a16207', flex: 'none' }} />
                      <span style={{ fontSize: '.85rem', color: 'var(--vm-muted)' }}>انتظار</span>
                      <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--vm-ink)', marginRight: 'auto' }}>{stats.pending}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#b91c1c', flex: 'none' }} />
                      <span style={{ fontSize: '.85rem', color: 'var(--vm-muted)' }}>مرفوض</span>
                      <span style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--vm-ink)', marginRight: 'auto' }}>{stats.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table section */}
            <div className="tbl-wrap fade-in" style={{ animationDelay: '.18s' }}>
              <div className="tbl-header">
                <h3>{TABLE_TITLES[filter] || 'الطلبات'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div className="filter-tabs">
                    {['all', 'pending', 'approved', 'rejected', 'locked'].map((f) => (
                      <button key={f} className={`ftab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'all' ? 'الكل' : STATUS_LABEL[f]}
                      </button>
                    ))}
                  </div>
                  <input
                    type="search"
                    className="tbl-search"
                    placeholder="بحث..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button onClick={() => loadAll()} className="yt-btn yt-btn-ghost" style={{ padding: '7px 12px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                {error ? (
                  <div className="empty-state">
                    <p style={{ color: '#b91c1c' }}>{error}</p>
                  </div>
                ) : loading ? (
                  <div className="spinner" />
                ) : filtered.length === 0 ? (
                  <div className="empty-state">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ opacity: 0.25, margin: '0 auto 12px' }}>
                      <circle cx="12" cy="12" r="10" /><path d="M8 15h8M9 9h.01M15 9h.01" />
                    </svg>
                    <p>لا توجد طلبات في هذا القسم</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="tbl-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>المركز</th>
                            <th>التواصل</th>
                            <th>الموقع</th>
                            <th>الخدمات</th>
                            <th>تاريخ التقديم</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((m) => (
                            <tr key={m.id}>
                              <td>
                                <div className="td-name">{esc(m.shop_name)}</div>
                                <div className="td-sub">{esc(m.owner_name)}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '.88rem' }} dir="ltr">{esc(m.phone)}</div>
                                <div className="td-sub" dir="ltr">{esc(m.email)}</div>
                              </td>
                              <td>{esc(m.location) || '—'}</td>
                              <td>
                                <div className="services-tags">
                                  {(m.services || []).length ? (
                                    (m.services || []).map((s, i) => (
                                      <span className="svc-tag" key={i}>
                                        {esc(s)}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ color: 'var(--vm-muted)', fontSize: '.82rem' }}>—</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ fontSize: '.87rem', color: 'var(--vm-muted)' }}>{fmtDate(m.created_at)}</td>
                              <td>
                                <span className={`status-badge ${m.status}`}>{STATUS_LABEL[m.status] || m.status}</span>
                                {m.notes ? (
                                  <div className="td-sub" style={{ marginTop: 4, maxWidth: 140 }}>
                                    {esc(m.notes)}
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <RowActions
                                  m={m}
                                  busy={busyId === m.id}
                                  onApprove={() => doApprove(m.id)}
                                  onReject={() => {
                                    setRejectId(m.id);
                                    setRejectNotes('');
                                  }}
                                  onSuspend={() => doSuspend(m.id)}
                                  onUnlock={() => doUnlock(m.id)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="mobile-cards">
                      {filtered.map((m) => (
                        <div className="m-card" key={m.id}>
                          <div className="m-card-head">
                            <div>
                              <div className="td-name">{esc(m.shop_name)}</div>
                              <div className="td-sub">{esc(m.owner_name)}</div>
                            </div>
                            <span className={`status-badge ${m.status}`}>{STATUS_LABEL[m.status] || m.status}</span>
                          </div>
                          <div className="m-card-row">
                            <span className="m-card-tag">الهاتف:</span>
                            <span className="m-card-val" dir="ltr">{esc(m.phone)}</span>
                          </div>
                          <div className="m-card-row">
                            <span className="m-card-tag">الموقع:</span>
                            <span className="m-card-val">{esc(m.location) || '—'}</span>
                          </div>
                          <div className="m-card-row">
                            <span className="m-card-tag">التاريخ:</span>
                            <span className="m-card-val">{fmtDate(m.created_at)}</span>
                          </div>
                          {(m.services || []).length ? (
                            <div className="services-tags" style={{ marginTop: 8 }}>
                              {(m.services || []).map((s, i) => (
                                <span className="svc-tag" key={i}>
                                  {esc(s)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="m-card-actions">
                            <RowActions
                              m={m}
                              busy={busyId === m.id}
                              onApprove={() => doApprove(m.id)}
                              onReject={() => {
                                setRejectId(m.id);
                                setRejectNotes('');
                              }}
                              onSuspend={() => doSuspend(m.id)}
                              onUnlock={() => doUnlock(m.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Reject Modal */}
      <div className={`modal-overlay${rejectId ? ' open' : ''}`} onClick={() => setRejectId(null)}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h3>رفض الطلب</h3>
          <p>يمكنك إضافة ملاحظة للمتقدم (اختياري)</p>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="سبب الرفض أو ملاحظات..."
          />
          <div className="modal-actions">
            <button onClick={() => setRejectId(null)} className="yt-btn yt-btn-ghost">
              إلغاء
            </button>
            <button onClick={confirmReject} disabled={busyId === rejectId} className="yt-btn" style={{ background: '#b91c1c' }}>
              رفض الطلب
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

// ── Per-row action buttons (status-aware) ──
function RowActions({ m, busy, onApprove, onReject, onSuspend, onUnlock }) {
  if (busy) {
    return <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--vm-line)', borderTopColor: 'var(--vm-blue)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />;
  }
  if (m.status === 'pending') {
    return (
      <div className="action-btns">
        <button className="ab ab-approve" onClick={onApprove}>✅ قبول</button>
        <button className="ab ab-reject" onClick={onReject}>❌ رفض</button>
      </div>
    );
  }
  if (m.status === 'approved') {
    return (
      <div className="action-btns">
        <button className="ab ab-suspend" onClick={onSuspend}>🚫 إلغاء</button>
      </div>
    );
  }
  if (m.status === 'rejected') {
    return (
      <div className="action-btns">
        <button className="ab ab-approve" onClick={onApprove}>✅ إعادة قبول</button>
      </div>
    );
  }
  if (m.status === 'locked') {
    return (
      <div className="action-btns">
        <button className="ab ab-unlock" onClick={onUnlock}>🔓 فك القفل وإعادة التفعيل</button>
      </div>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Original "YouTube Studio" Super-Admin design — ported verbatim from the
// legacy admin-vold.html <style> block. Class names namespaced via --vm-* vars
// to avoid clashes with the app's global Tailwind layer.
// ═══════════════════════════════════════════════════════════════════════════
const CSS = `
.yt-layout, .yt-layout *, .yt-layout *::before, .yt-layout *::after,
.modal-overlay, .modal-overlay *, .toast { box-sizing:border-box; }
:root{
  --vm-blue:#2563eb; --vm-ink:#09090b; --vm-muted:#6b7280; --vm-paper:#fff;
  --vm-bg:#f9f9f9; --vm-line:#e5e7eb; --vm-sidebar-w:230px;
  --vm-shadow-card:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --vm-line-soft:#f3f4f6;
}
.yt-layout{ display:flex; min-height:100vh; background:var(--vm-bg);
  color:var(--vm-ink); font-family:'Almarai',system-ui,sans-serif; line-height:1.6; }
.yt-layout a{ text-decoration:none; color:inherit; }
.yt-layout button{ font-family:inherit; cursor:pointer; }

/* Sidebar */
.yt-sidebar{ width:var(--vm-sidebar-w); background:#09090b; color:#fff;
  display:flex; flex-direction:column; position:fixed; top:0; right:0; bottom:0;
  z-index:100; overflow-y:auto; transition:transform .25s ease; }
@media(max-width:960px){ .yt-sidebar{ transform:translateX(100%); } .yt-sidebar.open{ transform:translateX(0); } }
.yt-sidebar-logo{ display:flex; align-items:center; gap:10px; padding:20px 18px 16px;
  border-bottom:1px solid rgba(255,255,255,.08); direction:ltr; justify-content:flex-start; }
.yt-sidebar-logo svg{ flex:none; }
.yt-logo-text{ display:flex; flex-direction:column; }
.yt-logo-name{ font-weight:800; font-size:1rem; letter-spacing:.04em; color:#fff; line-height:1.1; }
.yt-logo-name span{ color:#3b82f6; }
.yt-logo-sub{ font-size:.6rem; font-weight:700; color:rgba(255,255,255,.4);
  letter-spacing:.14em; margin-top:1px; text-transform:uppercase; }
.yt-sidebar-nav{ flex:1; padding:12px 0; }
.yt-nav-section{ margin-bottom:4px; }
.yt-nav-label{ font-size:.62rem; font-weight:700; color:rgba(255,255,255,.35);
  letter-spacing:.12em; text-transform:uppercase; padding:12px 18px 5px; }
.yt-nav-item{ display:flex; align-items:center; gap:11px; padding:10px 18px;
  font-size:.88rem; font-weight:700; color:rgba(255,255,255,.65); transition:.15s;
  cursor:pointer; border:0; background:none; width:100%; text-align:right; position:relative; }
.yt-nav-item:hover{ background:rgba(255,255,255,.07); color:#fff; }
.yt-nav-item.active{ background:rgba(37,99,235,.22); color:#fff; }
.yt-nav-item.active::before{ content:''; position:absolute; right:0; top:4px; bottom:4px;
  width:3px; border-radius:0 3px 3px 0; background:#3b82f6; }
.yt-nav-badge{ margin-right:auto; background:#2563eb; color:#fff; font-size:.68rem;
  font-weight:800; padding:2px 8px; border-radius:99px; min-width:20px; text-align:center; }
.yt-sidebar-user{ padding:16px 18px; border-top:1px solid rgba(255,255,255,.08);
  display:flex; align-items:center; gap:10px; }
.yt-su-avatar{ width:34px; height:34px; border-radius:50%; background:#2563eb; color:#fff;
  display:grid; place-items:center; font-size:.9rem; font-weight:900; flex:none; }
.yt-su-info{ flex:1; min-width:0; }
.yt-su-name{ font-size:.88rem; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.yt-su-role{ font-size:.7rem; color:rgba(255,255,255,.45); }
.yt-su-logout{ width:32px; height:32px; border-radius:9px; border:1.5px solid rgba(255,255,255,.15);
  background:none; display:grid; place-items:center; cursor:pointer; color:rgba(255,255,255,.5); transition:.15s; flex:none; }
.yt-su-logout:hover{ border-color:#3b82f6; color:#3b82f6; }

/* Main */
.yt-main{ flex:1; margin-right:var(--vm-sidebar-w); display:flex; flex-direction:column; min-height:100vh; }
@media(max-width:960px){ .yt-main{ margin-right:0; } }
.yt-topbar{ background:var(--vm-paper); border-bottom:1px solid var(--vm-line); height:64px; padding:0 24px;
  display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; backdrop-filter:blur(8px); }
.yt-topbar-left{ display:flex; align-items:center; gap:14px; }
.yt-topbar-right{ display:flex; align-items:center; gap:10px; }
.burger-btn{ width:38px; height:38px; border-radius:9px; border:1.5px solid var(--vm-line);
  background:none; display:none; place-items:center; cursor:pointer; color:var(--vm-muted); transition:.15s; }
@media(max-width:960px){ .burger-btn{ display:grid; } }
.burger-btn:hover{ border-color:var(--vm-blue); color:var(--vm-blue); }
.yt-page-title{ font-size:1.08rem; font-weight:900; color:var(--vm-ink); line-height:1.1; }
.yt-page-sub{ font-size:.74rem; color:var(--vm-muted); font-weight:600; }
.yt-btn{ display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:10px;
  font-family:inherit; font-size:.85rem; font-weight:700; cursor:pointer; transition:.15s; border:0; background:var(--vm-blue); color:#fff; }
.yt-btn:hover{ background:#1d4ed8; }
.yt-btn-ghost{ background:none; color:var(--vm-muted); border:1.5px solid var(--vm-line); }
.yt-btn-ghost:hover{ border-color:var(--vm-blue); color:var(--vm-blue); background:none; }
.yt-content{ flex:1; padding:28px; }
@media(max-width:960px){ .yt-content{ padding:16px; } }
.back-btn{ display:inline-flex; align-items:center; gap:6px; font-size:.84rem; font-weight:700; color:var(--vm-muted);
  padding:6px 12px; border-radius:9px; border:1.5px solid var(--vm-line); background:none; transition:.15s; white-space:nowrap; }
.back-btn:hover{ border-color:var(--vm-blue); color:var(--vm-blue); }

/* Stats */
.sa-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
@media(max-width:900px){ .sa-stats{ grid-template-columns:repeat(2,1fr); } }
@media(max-width:480px){ .sa-stats{ grid-template-columns:1fr; } }
.sa-stat{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; padding:20px;
  box-shadow:var(--vm-shadow-card); display:flex; flex-direction:column; gap:14px; transition:border-color .2s, box-shadow .2s; }
.sa-stat:hover{ border-color:rgba(37,99,235,.25); box-shadow:0 4px 18px rgba(37,99,235,.06); }
.sa-stat-head{ display:flex; align-items:center; justify-content:space-between; }
.sa-stat-icon{ width:38px; height:38px; border-radius:11px; display:grid; place-items:center; flex:none; }
.icon-pending{ background:#fef9c3; color:#a16207; }
.icon-approved{ background:#dcfce7; color:#15803d; }
.icon-rejected{ background:#fee2e2; color:#b91c1c; }
.icon-total{ background:rgba(37,99,235,.1); color:#2563eb; }
.sa-stat-label{ font-size:.78rem; font-weight:600; color:var(--vm-muted); }
.sa-stat-val{ font-size:2.2rem; font-weight:900; color:var(--vm-ink); line-height:1; letter-spacing:-.04em;
  font-family:'Inter',sans-serif; font-variant-numeric:tabular-nums; direction:ltr; align-self:flex-start; }
.sa-stat-footer{ font-size:.76rem; font-weight:600; color:var(--vm-muted); margin-top:-8px; }
.sa-stat-footer.up{ color:#16a34a; }
.sa-stat-footer.warn{ color:#d97706; }
.shop-breakdown{ display:flex; flex-direction:column; gap:6px; margin-top:-4px; }
.sh-type{ display:flex; align-items:center; gap:7px; }
.sh-type-dot{ width:8px; height:8px; border-radius:50%; flex:none; }
.sh-type-name{ font-size:.76rem; color:var(--vm-muted); font-weight:600; flex:1; }
.sh-type-count{ font-size:.82rem; font-weight:800; color:var(--vm-ink); }

/* Charts */
.charts-row{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
@media(max-width:860px){ .charts-row{ grid-template-columns:1fr; } }
.chart-card{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; padding:22px; box-shadow:var(--vm-shadow-card); }
.chart-card-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:18px; }
.chart-card-head h3{ font-size:.97rem; font-weight:900; color:var(--vm-ink); margin:0; }
.chart-card-head p{ font-size:.78rem; color:var(--vm-muted); margin:3px 0 0; }
.chart-period{ display:flex; gap:4px; background:var(--vm-bg); border:1px solid var(--vm-line); border-radius:9px; padding:3px; }
.cp-btn{ padding:4px 10px; border-radius:6px; font-family:inherit; font-size:.75rem; font-weight:700; border:0; background:none; color:var(--vm-muted); cursor:pointer; transition:.15s; }
.cp-btn.active{ background:var(--vm-paper); color:var(--vm-ink); box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* Table */
.tbl-wrap{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:16px; overflow:hidden; box-shadow:var(--vm-shadow-card); }
.tbl-header{ padding:18px 22px; border-bottom:1px solid var(--vm-line); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.tbl-header h3{ font-size:1rem; font-weight:800; color:var(--vm-ink); margin:0; }
.tbl-search{ padding:8px 14px; border:1.5px solid var(--vm-line); border-radius:10px; font-family:inherit; font-size:.88rem; outline:0; background:var(--vm-bg); color:var(--vm-ink); width:200px; transition:.15s; }
.tbl-search:focus{ border-color:var(--vm-blue); background:var(--vm-paper); }
.tbl-scroll{ overflow-x:auto; }
.tbl-wrap table{ width:100%; border-collapse:collapse; }
.tbl-wrap thead th{ padding:11px 16px; font-size:.72rem; font-weight:700; color:var(--vm-muted); background:var(--vm-bg);
  border-bottom:1px solid var(--vm-line); text-align:right; white-space:nowrap; letter-spacing:.06em; text-transform:uppercase; }
.tbl-wrap tbody td{ padding:14px 16px; border-bottom:1px solid var(--vm-line-soft); vertical-align:middle; font-size:.9rem; }
.tbl-wrap tbody tr:last-child td{ border-bottom:0; }
.tbl-wrap tbody tr:hover td{ background:#fafafa; }
.td-name{ font-weight:800; color:var(--vm-ink); }
.td-sub{ font-size:.8rem; color:var(--vm-muted); margin-top:2px; }
.status-badge{ display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:8px; font-size:.77rem; font-weight:700; }
.status-badge::before{ content:''; width:6px; height:6px; border-radius:50%; background:currentColor; }
.status-badge.pending{ background:#fef9c3; color:#a16207; }
.status-badge.approved{ background:#dcfce7; color:#15803d; }
.status-badge.rejected{ background:#fee2e2; color:#b91c1c; }
.status-badge.locked{ background:#fae8ff; color:#a21caf; }
.services-tags{ display:flex; flex-wrap:wrap; gap:4px; max-width:180px; }
.svc-tag{ padding:2px 8px; border-radius:6px; background:rgba(37,99,235,.08); color:#2563eb; font-size:.7rem; font-weight:700; }

/* Filter tabs */
.filter-tabs{ display:flex; gap:8px; flex-wrap:wrap; }
.ftab{ padding:7px 16px; border-radius:9px; border:1.5px solid var(--vm-line); background:var(--vm-paper);
  font-family:inherit; font-size:.85rem; font-weight:700; color:var(--vm-muted); cursor:pointer; transition:.15s; }
.ftab:hover{ border-color:var(--vm-blue); color:var(--vm-blue); }
.ftab.active{ background:var(--vm-blue); border-color:var(--vm-blue); color:#fff; }

/* Action buttons */
.action-btns{ display:flex; gap:6px; white-space:nowrap; }
.ab{ display:inline-flex; align-items:center; gap:4px; padding:7px 14px; border-radius:8px; border:1.5px solid;
  font-family:inherit; font-size:.78rem; font-weight:700; cursor:pointer; transition:.15s; }
.ab-approve{ background:#dcfce7; color:#15803d; border-color:#86efac; }
.ab-approve:hover{ background:#15803d; color:#fff; border-color:#15803d; }
.ab-reject{ background:#fee2e2; color:#b91c1c; border-color:#fca5a5; }
.ab-reject:hover{ background:#b91c1c; color:#fff; border-color:#b91c1c; }
.ab-suspend{ background:#fef9c3; color:#a16207; border-color:#fde68a; }
.ab-suspend:hover{ background:#a16207; color:#fff; border-color:#a16207; }
.ab-unlock{ background:#fae8ff; color:#a21caf; border-color:#f0abfc; }
.ab-unlock:hover{ background:#a21caf; color:#fff; border-color:#a21caf; }

/* Empty + loading */
.empty-state{ text-align:center; padding:64px 20px; color:var(--vm-muted); }
.empty-state p{ font-size:.95rem; font-weight:700; margin-top:12px; }
.spinner{ width:32px; height:32px; border:3px solid var(--vm-line); border-top-color:var(--vm-blue);
  border-radius:50%; animation:spin .7s linear infinite; margin:56px auto; }
@keyframes spin{ to{ transform:rotate(360deg); } }

/* Mobile cards */
@media(max-width:767px){
  .tbl-scroll{ display:none; }
  .mobile-cards{ display:block; padding:12px; }
  .m-card{ background:var(--vm-paper); border:1px solid var(--vm-line); border-radius:14px; padding:16px; margin-bottom:12px; box-shadow:var(--vm-shadow-card); }
  .m-card-head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
  .m-card-row{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
  .m-card-tag{ font-size:.75rem; color:var(--vm-muted); font-weight:600; }
  .m-card-val{ font-size:.88rem; color:var(--vm-ink); font-weight:700; }
  .m-card-actions{ display:flex; gap:8px; margin-top:12px; padding-top:12px; border-top:1px solid var(--vm-line); flex-wrap:wrap; }
}
@media(min-width:768px){ .mobile-cards{ display:none; } }

/* Modal */
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center;
  z-index:1000; padding:20px; opacity:0; pointer-events:none; transition:.2s; }
.modal-overlay.open{ opacity:1; pointer-events:auto; }
.modal-box{ background:var(--vm-paper); border-radius:20px; padding:28px; width:100%; max-width:440px; box-shadow:0 8px 24px rgba(0,0,0,.12); }
.modal-box h3{ font-size:1.05rem; font-weight:900; color:var(--vm-ink); margin:0 0 6px; }
.modal-box p{ font-size:.88rem; color:var(--vm-muted); margin:0 0 18px; }
.modal-box textarea{ width:100%; min-height:90px; border:1.5px solid var(--vm-line); border-radius:11px; padding:12px 14px;
  font-family:inherit; font-size:.9rem; color:var(--vm-ink); background:var(--vm-bg); resize:vertical; outline:0; box-sizing:border-box; }
.modal-box textarea:focus{ border-color:var(--vm-blue); background:var(--vm-paper); }
.modal-actions{ display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }

/* Toast */
.toast{ position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px); background:var(--vm-ink); color:#fff;
  padding:12px 22px; border-radius:12px; font-size:.9rem; font-weight:700; z-index:2000; transition:.3s; opacity:0; }
.toast.show{ transform:translateX(-50%) translateY(0); opacity:1; }
.toast.success{ background:#15803d; }
.toast.error{ background:#b91c1c; }

/* Mobile sidebar overlay */
.sidebar-overlay{ display:none; position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:90; }
@media(max-width:960px){ .sidebar-overlay.open{ display:block; } }

/* Hero */
.rev-hero{ background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#3b82f6 100%); border-radius:20px; padding:28px 32px;
  display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; color:#fff; position:relative; overflow:hidden; flex-wrap:wrap; gap:16px; }
.rev-hero::before{ content:''; position:absolute; top:-40px; left:-40px; width:220px; height:220px; border-radius:50%; background:rgba(255,255,255,.06); pointer-events:none; }
.rh-label{ font-size:.82rem; font-weight:700; opacity:.75; letter-spacing:.06em; margin-bottom:8px; }
.rh-val{ font-size:2.6rem; font-weight:900; line-height:1; font-family:'Inter',sans-serif; letter-spacing:-.03em; }
.rh-change{ display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.15); border-radius:8px; padding:5px 11px; font-size:.8rem; font-weight:700; margin-top:10px; }
.rh-actions{ display:flex; gap:10px; position:relative; z-index:1; }
.rh-btn{ padding:10px 20px; border-radius:11px; font-family:inherit; font-size:.88rem; font-weight:700; cursor:pointer; transition:.15s; border:0; }
.rh-btn-primary{ background:#fff; color:#2563eb; }
.rh-btn-primary:hover{ background:#f0f6ff; }
.rh-btn-ghost{ background:rgba(255,255,255,.15); color:#fff; border:1.5px solid rgba(255,255,255,.3); }
.rh-btn-ghost:hover{ background:rgba(255,255,255,.25); }

.fade-in{ animation:fadeUp .4s ease both; }
@keyframes fadeUp{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:none; } }
`;
