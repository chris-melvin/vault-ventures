import { formatCents } from '../../lib/constants';
import type { NetWorthResponse } from '@shared/types';

interface Props {
  data: NetWorthResponse;
}

const CARDS = [
  { key: 'total_net_worth_cents', label: 'Total Net Worth', glow: true },
  { key: 'wallet_cents', label: 'Wallet' },
  { key: 'bank_cents', label: 'Bank Balance' },
  { key: 'portfolio_value_cents', label: 'Portfolio Value' },
  { key: 'pending_interest_cents', label: 'Pending Interest' },
  { key: 'pending_rent_cents', label: 'Pending Rent' },
] as const;

export default function NetWorthSummary({ data }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {CARDS.map((card) => {
        const value = data[card.key];
        const isTotal = card.key === 'total_net_worth_cents';
        return (
          <div
            key={card.key}
            className={`card-panel p-4 ${isTotal ? 'gold-glow col-span-2 md:col-span-3' : ''}`}
          >
            <div className="text-xs text-white/40 uppercase tracking-wider">{card.label}</div>
            <div className={`font-bold text-2xl ${isTotal ? 'text-casino-gold' : value > 0 ? 'text-green-400' : 'text-white/60'}`}>
              {formatCents(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
