/**
 * MetricHero — the 4-card hero section for the Admin dashboard.
 * VOLD MOTOR System Token: white surfaces, rounded-xl, shadow-sm, blue primary,
 * 3xl bold metric, xs uppercase label, tinted icon box, hover-lift.
 * Server-safe (static); collapses to grid-cols-1 on mobile.
 *
 * NOTE: values below are mock placeholders — swap for live data when wiring.
 */
import { Wallet, Loader, Store, ShieldCheck } from 'lucide-react';
import StatTile from './StatTile';

const CARDS = [
  { icon: Wallet, tone: 'emerald', label: 'صافي الأرباح', value: '24,050 ⃀', sub: 'هذا الشهر' },
  { icon: Loader, tone: 'blue', label: 'طلبات قيد التنفيذ', value: '26', sub: 'نشطة الآن' },
  { icon: Store, tone: 'blue', label: 'الورش النشطة', value: '15', sub: 'مركز مفعّل' },
  { icon: ShieldCheck, tone: 'amber', label: 'معدل الالتزام', value: '94%', sub: 'ضمن المستهدف' },
];

export default function MetricHero() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((c) => (
        <StatTile key={c.label} icon={c.icon} tone={c.tone} label={c.label} value={c.value} sub={c.sub} />
      ))}
    </div>
  );
}
