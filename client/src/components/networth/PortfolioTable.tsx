import { formatCents } from '../../lib/constants';
import type { PortfolioBreakdownItem } from '@shared/types';

interface Props {
  items: PortfolioBreakdownItem[];
}

export default function PortfolioTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="card-panel p-4">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Portfolio Holdings</h3>
        <p className="text-white/30 text-sm text-center py-4">No holdings yet. Visit the Market to invest.</p>
      </div>
    );
  }

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Portfolio Holdings</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs uppercase border-b border-white/10">
              <th className="text-left py-2 pr-2">Item</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">Cost</th>
              <th className="text-right py-2 pl-2">P/L</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.item_id} className="border-b border-white/5">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <div className="text-white/90 font-medium">{item.name}</div>
                      <div className="text-white/30 text-xs capitalize">{item.category}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right text-white/60 px-2">{item.quantity}</td>
                <td className="text-right text-white/80 px-2">{formatCents(item.current_value_cents)}</td>
                <td className="text-right text-white/50 px-2">{formatCents(item.cost_basis_cents)}</td>
                <td className={`text-right font-medium pl-2 ${item.profit_cents >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.profit_cents >= 0 ? '+' : ''}{formatCents(item.profit_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
