import { formatCents } from '../../lib/constants';
import type { StatsDeepDiveResponse } from '@shared/types';

interface Props {
  data: StatsDeepDiveResponse['market_roi'];
}

export default function MarketROIPanel({ data }: Props) {
  const stats = [
    { label: 'Total Invested', value: data.total_invested_cents, color: 'text-white/80' },
    { label: 'Total Sold', value: data.total_sold_cents, color: 'text-white/80' },
    { label: 'Current Holdings', value: data.current_holdings_value_cents, color: 'text-blue-400' },
    { label: 'Realized P/L', value: data.realized_pl_cents, color: data.realized_pl_cents >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Unrealized P/L', value: data.unrealized_pl_cents, color: data.unrealized_pl_cents >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Rent Earned', value: data.rent_earned_cents, color: 'text-casino-gold' },
  ];

  return (
    <div className="card-panel p-4">
      <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Market ROI</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
            <div className={`font-bold text-lg ${stat.color}`}>
              {stat.value >= 0 && stat.label.includes('P/L') ? '+' : ''}
              {formatCents(stat.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
