'use client';

/**
 * StaffPermissionMatrix — "لوحة خيارات الصلاحيات الدقيقة".
 * A dense access grid: one block per staff node with the three global permission
 * keys as toggle checkboxes wired to optimistic server mutations. YouTube-Studio
 * tokens · bold headers · slate-500 context · RTL.
 */
import { Check } from 'lucide-react';
import { setWorkerPermission } from '@/app/dashboard-pro/actions';

const ROLE_LABEL = { manager: 'مشرف', technician: 'فني' };
const PERMS = [
  { key: 'can_view_financials', label: 'عرض المالية', hint: 'الرسم التحليلي ومؤشرات الإيراد والتقارير المالية' },
  { key: 'can_manage_catalog', label: 'إدارة الكشّة', hint: 'قوالب الخدمات والأسعار الثابتة' },
  { key: 'can_transfer_staff', label: 'نقل الموظفين', hint: 'نقل الفنّيين بين الفروع' },
];

export default function StaffPermissionMatrix({ members = [], setMembers, showToast }) {
  const staff = members.filter((m) => m.user_id);
  if (!staff.length) return null;

  async function toggle(m, key) {
    const next = !m[key];
    const prev = members;
    setMembers((ms) => ms.map((x) => (x.user_id === m.user_id ? { ...x, [key]: next } : x)));
    const r = await setWorkerPermission(m.user_id, key, next);
    if (!r?.ok) { setMembers(prev); showToast?.(r?.error || 'تعذّر حفظ الصلاحية', 'error'); }
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">لوحة خيارات الصلاحيات الدقيقة</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">تحكّم دقيق بما يراه ويديره كل موظف عبر مفاتيح مرتبطة مباشرةً بقاعدة البيانات.</p>

      <div className="mt-6 space-y-3">
        {staff.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{m.full_name || '—'}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{ROLE_LABEL[m.role] || 'فني'}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {PERMS.map((p) => {
                const on = !!m[p.key];
                return (
                  <button key={p.key} onClick={() => toggle(m, p.key)} role="checkbox" aria-checked={on} title={p.hint}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-start transition-all ${on ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className={`grid h-5 w-5 flex-none place-items-center rounded-md border transition-colors ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent'}`}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${on ? 'text-blue-700' : 'text-slate-700'}`}>{p.label}</span>
                      <span className="block truncate text-[11px] font-medium text-slate-400">{p.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
