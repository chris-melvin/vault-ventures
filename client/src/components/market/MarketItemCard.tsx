import type { MarketItemWithPrice } from '@shared/types';
import { formatCents } from '../../lib/constants';
import TrendIndicator from './TrendIndicator';

const RARITY_COLORS: Record<string, string> = {
  common: 'text-white/50',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-casino-gold',
};

interface Props {
  item: MarketItemWithPrice;
  onBuy: (itemId: string, quantity?: number) => void;
  onSelect: (itemId: string) => void;
}

export default function MarketItemCard({ item, onBuy, onSelect }: Props) {
  return (
    <div
      className="card-panel p-4 hover:border-casino-gold/20 transition-all cursor-pointer"
      onClick={() => onSelect(item.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <div className="text-white font-bold text-sm">{item.name}</div>
            <div className={`text-[10px] uppercase tracking-wider font-bold ${RARITY_COLORS[item.rarity]}`}>
              {item.rarity}
            </div>
          </div>
        </div>
        <TrendIndicator percent={item.trend_percent} />
      </div>

      <div className="text-white/40 text-xs mb-3 line-clamp-2">{item.description}</div>

      {item.rent_rate > 0 && (
        <div className="text-emerald-400/70 text-[10px] mb-2 font-bold">
          Earns {(item.rent_rate * 100).toFixed(2)}%/hr rent
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-casino-gold font-bold">{formatCents(item.current_price_cents)}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy(item.id);
          }}
          className="btn-primary text-xs !py-1.5 !px-3"
        >
          Buy
        </button>
      </div>
    </div>
  );
}
