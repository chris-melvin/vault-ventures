import type { InventoryItem } from '@shared/types';
import { formatCents } from '../../lib/constants';

interface Props {
  item: InventoryItem;
  onSell: (itemId: string) => void;
}

export default function PortfolioItem({ item, onSell }: Props) {
  const isProfit = item.profit_cents > 0;
  const isLoss = item.profit_cents < 0;
  const hasRent = item.rent_rate > 0;

  return (
    <div className="card-panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{item.icon}</span>
          <div>
            <div className="text-white font-bold text-sm">{item.name}</div>
            <div className="text-white/40 text-xs">
              Qty: {item.quantity} &middot; Avg cost {formatCents(item.purchased_price_cents)}
            </div>
            {hasRent && (
              <div className="text-emerald-400/70 text-[10px] mt-0.5">
                Rent: {(item.rent_rate * 100).toFixed(2)}%/hr per unit
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-white font-bold text-sm">{formatCents(item.current_price_cents)}</div>
          <div
            className={`text-xs font-bold ${
              isProfit ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-white/40'
            }`}
          >
            {isProfit ? '+' : ''}{formatCents(item.profit_cents)}
          </div>
          {hasRent && item.pending_rent_cents > 0 && (
            <div className="text-emerald-400 text-[10px] font-bold mt-0.5">
              +{formatCents(item.pending_rent_cents)} rent
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onSell(item.item_id)}
          className="btn-secondary text-xs !py-1 !px-3"
        >
          Sell all for {formatCents(item.current_price_cents * item.quantity)}
        </button>
      </div>
    </div>
  );
}
