'use client';

/**
 * NotificationsBell — الجرس المفعّل.
 * يستطلع كل 30 ثانية ويولّد ثلاثة أنواع من الإشعارات:
 *   ① طلب جديد — كل عملية أُنشئت بعد آخر «قراءة» (منذ آخر فتح للجرس).
 *   ② مخزون قارب على النفاد — الأصناف التي وصلت حد التنبيه.
 *   ③ تقرير الذكاء الاصطناعي الشهري — يوم 25 من كل شهر.
 * شارة عدّاد حمراء، قائمة منسدلة مرتبة، وكل إشعار يفتح صفحته.
 * حالة «المقروء» تُحفظ محلياً (vm_notif_seen) فلا يتكرر الإزعاج.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ClipboardList, PackageOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const POLL_MS = 30000;

function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`;
  return `قبل ${Math.floor(s / 86400)} ي`;
}

export default function NotificationsBell({ centerId }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const seenKey = 'vm_notif_seen';
  const getSeen = () => { try { return Number(localStorage.getItem(seenKey)) || Date.now() - 86400000; } catch { return Date.now() - 86400000; } };

  const load = useCallback(async () => {
    if (!centerId) return;
    const seen = getSeen();
    const list = [];

    // ① الطلبات الجديدة (آخر 24 ساعة كحد أقصى للعرض)
    const since = new Date(Math.max(seen, Date.now() - 86400000)).toISOString();
    const { data: newOrders } = await supabase.from('orders')
      .select('id, customer_name, service_type, created_at')
      .eq('merchant_id', centerId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(10);
    (newOrders || []).forEach((o) => list.push({
      key: 'o-' + o.id, Icon: ClipboardList, tone: 'text-blue-600 bg-blue-50',
      title: 'طلب جديد', body: `${o.service_type || 'خدمة'} — ${o.customer_name || 'عميل'}`,
      at: o.created_at, ts: new Date(o.created_at).getTime(), href: '/dashboard',
    }));

    // ② نواقص المخزون
    const { data: inv } = await supabase.from('inventory')
      .select('id, name, quantity, min_quantity')
      .eq('merchant_id', centerId).limit(300);
    const low = (inv || []).filter((i) => (i.quantity ?? 0) <= (i.min_quantity ?? 0));
    if (low.length) list.push({
      key: 'low-stock', Icon: PackageOpen, tone: 'text-amber-600 bg-amber-50',
      title: `${low.length} صنف قارب على النفاد`,
      body: low.slice(0, 3).map((i) => i.name).join('، ') + (low.length > 3 ? '…' : ''),
      at: new Date().toISOString(), ts: Date.now() - 1, href: '/dashboard/inventory', sticky: true,
    });

    // ③ تقرير الذكاء الاصطناعي — يوم 25
    if (new Date().getDate() === 25) list.push({
      key: 'ai-' + new Date().toISOString().slice(0, 7), Icon: Sparkles, tone: 'text-violet-600 bg-violet-50',
      title: 'تقرير الذكاء الاصطناعي الشهري جاهز',
      body: 'التحليل التنفيذي لأداء هذا الشهر متاح الآن في التقارير.',
      at: new Date().toISOString(), ts: Date.now() - 2, href: '/dashboard/reports', sticky: true,
    });

    list.sort((a, b) => b.ts - a.ts);
    setItems(list);
    setUnread(list.filter((n) => n.sticky || n.ts > seen).length);
  }, [centerId]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try { localStorage.setItem(seenKey, String(Date.now())); } catch {}
      setUnread(items.filter((n) => n.sticky).length ? items.filter((n) => n.sticky).length : 0);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label="الإشعارات"
        className="relative grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100">
        <Bell size={19} strokeWidth={2.1} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -start-0.5 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white" dir="ltr">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" dir="rtl">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">الإشعارات</div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items.length ? items.map((n) => (
              <Link key={n.key} href={n.href} onClick={() => setOpen(false)}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                <span className={`mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full ${n.tone}`}><n.Icon size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-slate-900">{n.title}</span>
                  <span className="block truncate text-xs font-medium text-slate-500">{n.body}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{timeAgo(n.at)}</span>
                </span>
              </Link>
            )) : (
              <div className="grid place-items-center py-12 text-sm text-slate-400">لا إشعارات جديدة</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
