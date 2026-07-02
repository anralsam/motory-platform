/**
 * FinancePanel — admin finance view. Pure presentational; receives computed
 * figures from the server. VOLD MOTOR System Token.
 */
import { Wallet, Receipt, TrendingUp } from 'lucide-react';
import StatTile from './StatTile';

const sar = (n) => `${(Number(n) || 0).toLocaleString('en-US')} ⃁`;

export default function FinancePanel({ revenue = 0, ordersValue = 0, completed = 0, avgOrder = 0 }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatTile icon={Wallet} tone="emerald" label="إجمالي الإيراد" value={sar(revenue)} sub={`${completed} طلب مكتمل`} />
        <StatTile icon={Receipt} tone="blue" label="قيمة الطلبات" value={sar(ordersValue)} sub="إجمالي القيمة المسجّلة" />
        <StatTile icon={TrendingUp} tone="amber" label="متوسط الطلب" value={sar(avgOrder)} sub="لكل طلب مكتمل" />
      </div>
    </div>
  );
}
