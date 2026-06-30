'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useAuth } from '@/components/AuthProvider';
import { roleOf } from '@/lib/roles';
import { supabase } from '@/lib/supabaseClient';
import { useServices } from '@/lib/useServices';
import { fmtSar } from '@/lib/billing';
import ServiceModal from '@/components/ServiceModal';
import Toast from '@/components/Toast';

const THEMES = [
  { key: 'default', label: 'الافتراضي', bg: '#f9fafb' },
  { key: 'slate', label: 'Slate', bg: '#eef2f7' },
  { key: 'zinc', label: 'Zinc', bg: '#f4f4f5' },
  { key: 'neutral', label: 'Neutral', bg: '#f5f5f4' },
  { key: 'bluegray', label: 'Blue-gray', bg: '#e9eff5' },
  { key: 'stone', label: 'Stone', bg: '#f5f3ef' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const myRole = roleOf(user?.user_metadata?.role);
  const centerId = myRole === 'owner' ? user?.id : (user?.user_metadata?.center_id || user?.id);

  const selectedId = useBranchStore((s) => s.selectedBranchId);
  const branches = useBranchStore((s) => s.branches);
  const loadBranches = useBranchStore((s) => s.loadBranches);
  const primary = branches.find((b) => b.is_primary) || branches[0];
  const centerType = useMemo(() => {
    if (selectedId !== 'all') return branches.find((b) => b.id === selectedId)?.center_type || 'أخرى';
    return primary?.center_type || 'أخرى';
  }, [selectedId, branches, primary]);

  const [tab, setTab] = useState('identity');

  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const tt = useRef(null);
  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type });
    clearTimeout(tt.current);
    tt.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-extrabold text-gray-900">الإعدادات</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[['identity', 'هوية المركز'], ['services', 'الخدمات والأسعار']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-extrabold transition ${tab === k ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'identity'
        ? <IdentityTab user={user} centerId={centerId} loadBranches={loadBranches} showToast={showToast} />
        : <ServicesTab centerId={centerId} branchId={selectedId} centerType={centerType} showToast={showToast} />}

      <Toast toast={toast} />
    </div>
  );
}

/* ── Tab 1: Identity & Compliance ── */
function IdentityTab({ user, centerId, loadBranches, showToast }) {
  const m = user?.user_metadata || {};
  const [name, setName] = useState('');
  const [vat, setVat] = useState('');
  const [phone, setPhone] = useState('');
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [theme, setTheme] = useState('default');

  useEffect(() => {
    setName(m.center_name || m.shop_name || '');
    setVat(m.vat_number || '');
    setPhone(m.contact_phone || m.phone || '');
    try { setLogo(localStorage.getItem('vm_logo') || m.logo_url || null); } catch (e) { setLogo(m.logo_url || null); }
    try { const t = localStorage.getItem('vm_theme') || 'default'; setTheme(t); document.documentElement.setAttribute('data-theme', t === 'default' ? '' : t); } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function saveIdentity() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { center_name: name.trim(), vat_number: vat.trim(), contact_phone: phone.trim() } });
    setSaving(false);
    if (error) { showToast('تعذّر الحفظ: ' + error.message, 'error'); return; }
    showToast('✅ تم حفظ بيانات المركز');
  }

  async function onLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('الحجم يتجاوز 2MB', 'error'); return; }
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${centerId}/logo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('branding').upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) { setUploading(false); showToast('تعذّر الرفع: ' + up.error.message, 'error'); return; }
    const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(path);
    // Persist: all owner branches + user metadata + local + broadcast
    try { await supabase.from('branches').update({ logo_url: publicUrl }).eq('owner_id', centerId); } catch (e) {}
    try { await supabase.auth.updateUser({ data: { logo_url: publicUrl } }); } catch (e) {}
    try { localStorage.setItem('vm_logo', publicUrl); } catch (e) {}
    window.dispatchEvent(new CustomEvent('vm:logo-change', { detail: { url: publicUrl } }));
    if (loadBranches) await loadBranches();
    setLogo(publicUrl); setUploading(false);
    showToast('✅ تم تحديث الشعار (يظهر في الشريط الجانبي والفواتير)');
  }

  function applyTheme(key) {
    setTheme(key);
    try { localStorage.setItem('vm_theme', key); } catch (e) {}
    document.documentElement.setAttribute('data-theme', key === 'default' ? '' : key);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-gray-900">بيانات المركز والامتثال الضريبي</h3>
        <p className="mt-1 text-sm text-gray-500">تظهر في الفواتير الضريبية ورمز ZATCA.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="اسم المركز"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="مركز فولد" className={inp} /></Field>
          <Field label="الرقم الضريبي (VAT)"><input value={vat} onChange={(e) => setVat(e.target.value)} dir="ltr" placeholder="3XXXXXXXXXXXXX3" className={`${inp} text-right`} /></Field>
          <Field label="رقم التواصل"><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="05XXXXXXXX" className={`${inp} text-right`} /></Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={saveIdentity} disabled={saving} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">حفظ البيانات</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-gray-900">شعار المركز (White-Label)</h3>
        <p className="mt-1 text-sm text-gray-500">يُرفع إلى التخزين السحابي ويحل محل شعار VOLD في الشريط الجانبي والفواتير.</p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <label className="flex-1 cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-gray-50 p-6 text-center transition hover:border-brand">
            <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploading} />
            <div className="font-bold text-gray-800">{uploading ? 'جارٍ الرفع...' : 'اضغط لرفع الشعار'}</div>
            <div className="text-xs text-gray-500">PNG / SVG / JPG — أقل من 2MB</div>
          </label>
          <div className="grid h-20 w-36 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            {logo ? <img src={logo} alt="" className="max-h-14 max-w-[120px] object-contain" /> : <span className="text-xs text-slate-400">لا شعار</span>}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-gray-900">مظهر اللوحة</h3>
        <p className="mt-1 text-sm text-gray-500">يُطبّق على كل صفحات لوحتك.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button key={t.key} onClick={() => applyTheme(t.key)} className={`overflow-hidden rounded-2xl border-2 text-start transition ${theme === t.key ? 'border-brand' : 'border-slate-200'}`}>
              <div className="flex h-12 items-center gap-2 px-3" style={{ background: t.bg }}>
                <span className="h-6 w-6 rounded-md border border-black/5 bg-white" />
                {theme === t.key && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" className="ms-auto"><path d="M20 6 9 17l-5-5" /></svg>}
              </div>
              <div className="bg-white px-3 py-2 text-xs font-extrabold text-gray-800">{t.label}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Tab 2: Services & Prices CRUD ── */
function ServicesTab({ centerId, branchId, centerType, showToast }) {
  const { services, loading, error, refetch } = useServices(centerId, branchId);
  const [modal, setModal] = useState({ open: false, editing: null });

  async function remove(id) {
    if (!confirm('حذف هذه الخدمة؟')) return;
    const { error: err } = await supabase.from('service_menu').delete().eq('id', id);
    if (err) { showToast('تعذّر الحذف', 'error'); return; }
    await refetch();
    showToast('🗑️ تم حذف الخدمة');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">قائمة الخدمات والأسعار للفرع الحالي — تُستخدم في إنشاء الطلبات والفواتير.</p>
        <button onClick={() => setModal({ open: true, editing: null })} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          إضافة خدمة
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-slate-200 bg-gray-50 text-xs font-bold text-gray-500">
              <th className="px-5 py-3 text-start">اسم الخدمة</th>
              <th className="px-5 py-3 text-start">الفئة</th>
              <th className="px-5 py-3 text-start">السعر</th>
              <th className="px-5 py-3 text-start">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">جاري التحميل...</td></tr>
            ) : error ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-red-500">تعذّر التحميل: {error}</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">لا توجد خدمات بعد — أضف أول خدمة</td></tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} className="text-sm transition hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-bold text-gray-900">{s.name}</td>
                  <td className="px-5 py-3.5"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">{s.category || '—'}</span></td>
                  <td className="px-5 py-3.5 font-extrabold text-brand">{fmtSar(s.price)} ر.س</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setModal({ open: true, editing: s })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:border-brand hover:text-brand">تعديل</button>
                      <button onClick={() => remove(s.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:border-red-300">حذف</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ServiceModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSaved={() => { refetch(); showToast('✅ تم حفظ الخدمة'); }}
        centerId={centerId}
        branchId={branchId}
        centerType={centerType}
      />
    </div>
  );
}

const inp = 'w-full rounded-xl border border-slate-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';
function Field({ label, children }) {
  return (<label className="flex flex-col gap-1.5"><span className="text-xs font-bold text-gray-600">{label}</span>{children}</label>);
}
