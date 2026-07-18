'use client';

/**
 * ExpensePanel — the Professional Expense & Net Profit ledger.
 *
 * Three stacked surfaces, YouTube-Studio density:
 *   1. Consolidated summary — total OPEX, and the real take-home net profit
 *      (revenue − platform commission − OPEX). Negative margins render in
 *      high-contrast crimson with a warning marker.
 *   2. Swift logging header — one inline row to file an expense. Writes are
 *      applied optimistically (sub-100ms metric refresh) and rolled back if the
 *      server action rejects.
 *   3. Transaction ledger — sortable by date or amount, borderless row delete.
 *
 * RTL: layout uses CSS logical properties only (ms/me, ps/pe, text-start/end,
 * border-s/e) so flipping the locale store flips the whole surface with no
 * physical-direction leftovers. Numerals stay dir="ltr" inside RTL text.
 */
import { useMemo, useState } from 'react';
import { Trash2, Plus, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { EXPENSE_CATEGORIES, categoryLabel } from '@/lib/useExpenses';
import { PLATFORM_COMMISSION, timelineWindowStart, CHART_TIMELINES, localizedOptions } from '@/components/dashboard-pro/dna/engine';
import { addExpense, deleteExpense } from '@/app/dashboard-pro/actions';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15';

const sar = (n) => `${Math.round(Number(n) || 0).toLocaleString('en-US')} ⃁`;

function todayInputValue() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ExpensePanel({
  merchantId,
  branchId = 'all',
  branches = [],
  orders = [],
  expenses = [],
  setExpenses,
  loading = false,
}) {
  const { t, isEn, lang } = useT();

  const [timeline, setTimeline] = useState('month');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'amount'
  const [sortDir, setSortDir] = useState('desc');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  // ── Swift-logging form state ──
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('miscellaneous');
  const [formBranch, setFormBranch] = useState(branchId === 'all' ? '' : branchId);
  const [date, setDate] = useState(todayInputValue());
  const [saving, setSaving] = useState(false);

  const windowStart = useMemo(() => timelineWindowStart(timeline), [timeline]);

  // ── Reactive figures, scoped to the active period (branch scoping already
  //    applied by useExpenses / the branch store). ──
  const scopedExpenses = useMemo(
    () => expenses.filter((e) => e.expense_date && new Date(e.expense_date) >= windowStart),
    [expenses, windowStart],
  );

  const totals = useMemo(() => {
    const opex = scopedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const scopedOrders = orders.filter((o) => {
      if (!o.created_at || new Date(o.created_at) < windowStart) return false;
      if (branchId && branchId !== 'all' && o.branch_id !== branchId) return false;
      return o.status === 'completed';
    });
    const revenue = scopedOrders.reduce((s, o) => s + (Number(o.price) || 0), 0);
    const commission = revenue * PLATFORM_COMMISSION;
    return { opex, revenue, commission, net: revenue - commission - opex };
  }, [scopedExpenses, orders, windowStart, branchId]);

  const ledger = useMemo(() => {
    const rows = [...scopedExpenses];
    rows.sort((a, b) => {
      const va = sortBy === 'amount' ? Number(a.amount) || 0 : new Date(a.expense_date).getTime();
      const vb = sortBy === 'amount' ? Number(b.amount) || 0 : new Date(b.expense_date).getTime();
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return rows;
  }, [scopedExpenses, sortBy, sortDir]);

  function toggleSort(key) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('desc'); }
  }

  // ── Optimistic create ──
  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError(t('عنوان المصروف مطلوب', 'Title is required')); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) { setError(t('أدخل مبلغاً صحيحاً', 'Enter a valid amount')); return; }

    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      merchant_id: merchantId,
      branch_id: formBranch || null,
      title: title.trim(),
      amount: amt,
      category,
      expense_date: new Date(date || todayInputValue()).toISOString(),
      receipt_url: null,
      _pending: true,
    };
    setExpenses?.((prev) => [optimistic, ...prev]);
    setSaving(true);

    const res = await addExpense({
      title: optimistic.title,
      amount: amt,
      category,
      branchId: formBranch || null,
      expenseDate: optimistic.expense_date,
    });
    setSaving(false);

    if (res?.ok && res.expense) {
      setExpenses?.((prev) => prev.map((x) => (x.id === tempId ? { ...res.expense, amount: Number(res.expense.amount) || 0 } : x)));
      setTitle(''); setAmount(''); setCategory('miscellaneous'); setDate(todayInputValue());
    } else {
      setExpenses?.((prev) => prev.filter((x) => x.id !== tempId)); // roll back
      setError(res?.error || t('تعذّر حفظ المصروف', 'Could not save the expense'));
    }
  }

  // ── Optimistic delete ──
  async function remove(row) {
    setError('');
    setBusyId(row.id);
    const prev = expenses;
    setExpenses?.((list) => list.filter((x) => x.id !== row.id));
    const res = await deleteExpense(row.id);
    setBusyId(null);
    if (!res?.ok) {
      setExpenses?.(prev); // roll back
      setError(res?.error || t('تعذّر الحذف', 'Could not delete'));
    }
  }

  const negative = totals.net < 0;
  const branchName = (id) => branches.find((b) => b.id === id)?.name || t('عام (كل الفروع)', 'Company-wide');

  return (
    <div className="space-y-5">
      {/* ── Header + period filter ── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('المصاريف والأرباح الصافية', 'Expenses & Net Profit')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('سجّل مصاريف التشغيل لتُخصم تلقائياً من الإيرادات وتظهر ربحك الحقيقي.', 'Log operating costs — they are subtracted from revenue to show your real take-home profit.')}
          </p>
        </div>
        <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={`${INPUT} w-auto`}>
          {localizedOptions(CHART_TIMELINES, lang).map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── 1. Consolidated summary ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${CARD} p-8`}>
          <div className="text-xs font-bold text-slate-500">{t('إجمالي المصاريف', 'Total expenses')}</div>
          <div className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900" dir="ltr">{sar(totals.opex)}</div>
          <div className="mt-1.5 text-xs font-medium text-slate-400">
            {t(`${scopedExpenses.length} مصروف في الفترة المحددة`, `${scopedExpenses.length} expenses in range`)}
          </div>
        </div>

        <div className={`${CARD} p-8 ${negative ? 'border-rose-200' : ''}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">{t('صافي الأرباح الجيبي', 'Net take-home profit')}</span>
            {negative && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600">
                <AlertTriangle size={11} />{t('خسارة', 'Loss')}
              </span>
            )}
          </div>
          <div
            className="mt-3 font-mono text-3xl font-bold tabular-nums tracking-tight"
            dir="ltr"
            style={negative ? { color: '#e11d48' } : undefined}
          >
            <span className={negative ? '' : 'text-slate-900'}>{sar(totals.net)}</span>
          </div>
          <div className="mt-1.5 text-xs font-medium text-slate-400" dir={isEn ? 'ltr' : 'rtl'}>
            {t('الإيراد', 'Revenue')} <span dir="ltr">{sar(totals.revenue)}</span> − {t('عمولة المنصة', 'commission')} <span dir="ltr">{sar(totals.commission)}</span> − {t('المصاريف', 'expenses')} <span dir="ltr">{sar(totals.opex)}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Swift logging header ── */}
      <div className={`${CARD} p-8`}>
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Plus size={18} strokeWidth={2.6} /></span>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900">{t('تسجيل مصروف جديد', 'Log a new expense')}</div>
            <div className="text-xs font-medium text-slate-500">{t('يُحتسب فوراً في الملخّص أعلاه', 'Reflected in the summary instantly')}</div>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('البيان', 'Title')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT}
              placeholder={t('مثال: فاتورة كهرباء فرع 1', 'e.g. Branch 1 electricity bill')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('المبلغ', 'Amount')} (⃁)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr"
              className={`${INPUT} tabular-nums`} placeholder="0.00" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('التصنيف', 'Category')}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{isEn ? c.en : c.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('الفرع', 'Branch')}</label>
            <select value={formBranch} onChange={(e) => setFormBranch(e.target.value)} className={INPUT}>
              <option value="">{t('عام (كل الفروع)', 'Company-wide')}</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('التاريخ', 'Date')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className={INPUT} />
          </div>

          <div className="md:col-span-12">
            <button type="submit" disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60">
              <Plus size={16} strokeWidth={2.8} />
              {saving ? t('جارٍ الحفظ…', 'Saving…') : t('تسجيل مصروف جديد', 'Log expense')}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-700">{error}</p>
        )}
      </div>

      {/* ── 3. Transaction ledger ── */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold tracking-tight text-slate-900">{t('سجل المصاريف', 'Expense ledger')}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleSort('date')}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${sortBy === 'date' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
              <ArrowUpDown size={12} />{t('التاريخ', 'Date')}
            </button>
            <button onClick={() => toggleSort('amount')}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${sortBy === 'amount' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}>
              <ArrowUpDown size={12} />{t('المبلغ', 'Amount')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3 text-start">{t('البيان', 'Title')}</th>
                <th className="px-5 py-3 text-start">{t('التصنيف', 'Category')}</th>
                <th className="px-5 py-3 text-start">{t('الفرع', 'Branch')}</th>
                <th className="px-5 py-3 text-start">{t('التاريخ', 'Date')}</th>
                <th className="px-5 py-3 text-start">{t('المبلغ', 'Amount')}</th>
                <th className="px-5 py-3 text-end">{t('إجراء', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">{t('جاري التحميل…', 'Loading…')}</td></tr>
              ) : ledger.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                  {t('لا توجد مصاريف مسجّلة في هذه الفترة.', 'No expenses logged in this period.')}
                </td></tr>
              ) : ledger.map((row) => (
                <tr key={row.id} className={`text-sm transition-colors hover:bg-slate-50 ${row._pending ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3 font-semibold text-slate-800">{row.title}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{categoryLabel(row.category, isEn)}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{row.branch_id ? branchName(row.branch_id) : t('عام', 'Company-wide')}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-500" dir="ltr">
                    {row.expense_date ? new Date(row.expense_date).toISOString().slice(0, 10) : '—'}
                  </td>
                  <td className="px-5 py-3 font-mono font-bold tabular-nums text-slate-900" dir="ltr">{sar(row.amount)}</td>
                  <td className="px-5 py-3 text-end">
                    <button onClick={() => remove(row)} disabled={busyId === row.id || row._pending}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40">
                      <Trash2 size={14} />{t('حذف', 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
