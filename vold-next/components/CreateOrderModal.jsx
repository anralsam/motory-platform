'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { servicesFor } from '@/lib/centerTypes';
import { fetchTechnicians } from '@/lib/useOrders';
import { fetchServiceMenu } from '@/lib/useServices';

/**
 * POS intake — create a PENDING order and assign it to a technician.
 * onSubmitDone() is called by the parent to refetch + toast after success.
 */
export default function CreateOrderModal({ open, onClose, onCreated, centerId, branchId, centerType }) {
  const [services, setServices] = useState([]);
  const [servicePrice, setServicePrice] = useState(null);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [service, setService] = useState('');
  const [techId, setTechId] = useState('');
  const [techs, setTechs] = useState([]);
  const [found, setFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const lookupTimer = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPhone(''); setName(''); setMake(''); setModel(''); setPlate(''); setService(''); setServicePrice(null); setTechId(''); setFound(false); setError(''); setSaving(false);
    fetchTechnicians(centerId, branchId).then(setTechs);
    // Load the real services/price menu for this branch (fallback to defaults if empty).
    fetchServiceMenu(centerId, branchId).then((list) => {
      if (list && list.length) setServices(list);
      else setServices(servicesFor(centerType).map((n) => ({ id: n, name: n, price: null })));
    });
  }, [open, centerId, branchId, centerType]);

  // Phone → customer auto-fill (debounced). Owner-scoped; silently ignored for managers.
  useEffect(() => {
    clearTimeout(lookupTimer.current);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) { setFound(false); return; }
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('customers')
          .select('full_name,car_make,car_model,car_plate')
          .eq('merchant_id', centerId)
          .eq('phone', phone.trim())
          .limit(1);
        if (data && data[0]) {
          const c = data[0];
          setFound(true);
          if (!name) setName(c.full_name || '');
          if (!make) setMake(c.car_make || '');
          if (!model) setModel(c.car_model || '');
          if (!plate) setPlate(c.car_plate || '');
        } else setFound(false);
      } catch (e) { setFound(false); }
    }, 400);
    return () => clearTimeout(lookupTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, centerId]);

  if (!open) return null;

  async function save() {
    setError('');
    if (!plate.trim()) { setError('رقم اللوحة مطلوب'); return; }
    if (!techId) { setError('اختر الفني المسؤول عن الطلب'); return; }
    setSaving(true);

    // best-effort: upsert the customer (owner-scoped; managers skip silently)
    try {
      const ph = phone.trim();
      if (ph) {
        const { data: ex } = await supabase.from('customers').select('id').eq('merchant_id', centerId).eq('phone', ph).limit(1);
        if (!ex || !ex.length) {
          await supabase.from('customers').insert({
            merchant_id: centerId, full_name: name.trim() || null, phone: ph,
            car_make: make.trim() || null, car_model: model.trim() || null, car_plate: plate.trim() || null,
            branch_id: branchId && branchId !== 'all' ? branchId : null,
          });
        }
      }
    } catch (e) {}

    const { error: err } = await supabase.from('orders').insert({
      merchant_id: centerId,
      branch_id: branchId && branchId !== 'all' ? branchId : null,
      plate: plate.trim(),
      car_make: make.trim() || null,
      car_model: model.trim() || null,
      customer_name: name.trim() || null,
      customer_phone: phone.trim() || null,
      service_type: service || null,
      price: servicePrice != null ? servicePrice : null,
      status: 'pending',
      assigned_to: techId,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onCreated?.();
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-gray-900">إنشاء طلب جديد</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">استقبال سيارة وإسنادها لفني · نوع النشاط: {centerType || 'عام'}</p>

        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

        <div className="space-y-4">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم الجوال" hint={found ? 'عميل موجود ✓' : undefined}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="numeric" placeholder="05XXXXXXXX" className={`${inp} text-right`} />
            </Field>
            <Field label="اسم العميل">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" className={inp} />
            </Field>
          </div>

          {/* Car */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="الشركة المصنّعة">
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="تويوتا" className={inp} />
            </Field>
            <Field label="الطراز">
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="كامري" className={inp} />
            </Field>
          </div>

          {/* Saudi plate */}
          <div>
            <span className="mb-1.5 block text-xs font-bold text-gray-600">رقم اللوحة</span>
            <div className="flex items-stretch overflow-hidden rounded-xl border-2 border-gray-800 bg-white">
              <span className="flex items-center bg-gray-800 px-2 text-[10px] font-extrabold leading-none text-white">KSA<br />السعودية</span>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} dir="ltr" placeholder="أ ب ج 1234" className="w-full px-3 py-2.5 text-center font-mono text-base font-extrabold tracking-widest text-gray-900 outline-none" />
            </div>
          </div>

          {/* Context-aware service pills */}
          <div>
            <span className="mb-1.5 block text-xs font-bold text-gray-600">الخدمة المطلوبة</span>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <button key={s.id} type="button" onClick={() => { setService(s.name); setServicePrice(s.price); }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${service === s.name ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-brand'}`}>
                  {s.name}{s.price != null ? <span className="opacity-70"> · {s.price} ر.س</span> : null}
                </button>
              ))}
            </div>
          </div>

          {/* Technician assignment */}
          <Field label="إسناد إلى فني">
            {techs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700">
                لا يوجد فنيون في هذا الفرع — أضف فنياً من صفحة «الفريق» أولاً.
              </div>
            ) : (
              <select value={techId} onChange={(e) => setTechId(e.target.value)} className={inp}>
                <option value="">— اختر الفني —</option>
                {techs.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name || t.phone || 'فني'}</option>)}
              </select>
            )}
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">إلغاء</button>
          <button onClick={save} disabled={saving || techs.length === 0} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60">
            {saving && <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#fff" strokeOpacity="0.25" strokeWidth="4" /><path d="M22 12a10 10 0 0 1-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></svg>}
            إنشاء الطلب
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/15';

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs font-bold text-gray-600">
        {label}{hint && <span className="text-emerald-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
