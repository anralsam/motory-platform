// ── Supabase shared client ───────────────────────────────────────────────────
const { createClient } = supabase;
const _sb = createClient(
  'https://pycyttykvmbhykltnxzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Y3l0dHlrdm1iaHlrbHRueHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDk4MjgsImV4cCI6MjA5NDc4NTgyOH0.3qTumWEg9mYvjbxQpDWIhnBIGGkp8V7XJrjkfy_ZXag'
);

// ── جلسة مخزّنة مؤقتاً — استدعاء واحد بدل التكرار في كل query ──
let _sessionCache = null;
async function getCachedSession() {
  if (_sessionCache) return _sessionCache;
  const { data: { session } } = await _sb.auth.getSession();
  _sessionCache = session;
  return session;
}
_sb.auth.onAuthStateChange((_e, session) => { _sessionCache = session; });

// ── Custom 30-day session (phone OTP) ────────────────────────────────────────
const VOLD_SESSION_KEY = 'vold_session_v1';

function getVoldSession() {
  try {
    const raw = localStorage.getItem(VOLD_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() > s.expiry) { localStorage.removeItem(VOLD_SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}

function makePhoneSession(phone) {
  // بناء session وهمية تحاكي Supabase لكي يشتغل باقي الكود
  return {
    user: {
      id: 'phone_' + phone.replace(/\D/g, ''),
      phone,
      email: null,
      user_metadata: { phone, full_name: phone }
    }
  };
}

// Guard: redirect to login if no session
async function requireAuth() {
  // أولاً: جلسة Supabase الرسمية
  const session = await getCachedSession();
  if (session) return session;

  // ثانياً: جلسة الجوال المخصصة
  const voldSession = getVoldSession();
  if (voldSession?.phone) {
    return makePhoneSession(voldSession.phone);
  }

  // لا يوجد أي جلسة → اذهب لتسجيل الدخول
  window.location.href = 'login.html';
  return null;
}

// تسجيل الخروج — يمسح الجلستين
async function clearVoldSession() {
  localStorage.removeItem(VOLD_SESSION_KEY);
}

// معرّف التاجر الحالي (مختصر شائع الاستخدام)
async function getUid() {
  const s = await getCachedSession();
  return s?.user?.id || null;
}

// Logout: sign out and redirect to login
async function doLogout() {
  await _sb.auth.signOut();
  _sessionCache = null;
  clearVoldSession();
  localStorage.removeItem(VOLD_SESSION_KEY);
  window.location.href = 'login.html';
}

// Fill sidebar user info from session
async function fillSidebarUser() {
  const session = await requireAuth();
  if (!session) return;
  const meta = session.user.user_metadata || {};
  const phone = session.user.phone || meta.phone || '';
  const nameEl = document.querySelector('.sidebar-user .info b');
  const roleEl = document.querySelector('.sidebar-user .info span');
  const avatarEl = document.querySelector('.sidebar-user .avatar');
  if (nameEl) nameEl.textContent = meta.full_name || meta.shop_name || phone || 'المستخدم';
  if (roleEl) roleEl.textContent = meta.shop_name || (meta.role === 'admin' ? 'مدير النظام' : 'صاحب مركز');
  if (avatarEl) avatarEl.textContent = (meta.full_name || meta.shop_name || phone || 'م')[0];
}

// تنبيه خطأ موحّد — بدل الفشل الصامت
function vmError(msg) {
  let t = document.getElementById('vm-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'vm-toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#141417;color:#fff;border:1px solid #2563eb;padding:12px 24px;border-radius:12px;font-weight:700;font-size:.9rem;z-index:9999;box-shadow:0 12px 40px rgba(0,0,0,.4);font-family:Almarai,sans-serif;direction:rtl';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.display = 'none'; }, 4000);
}
