import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { MarketItemDetail as MarketItemDetailType } from '@shared/types';
import { market } from '../../lib/api';
import { formatCents } from '../../lib/constants';
import TrendIndicator from './TrendIndicator';
import PriceSparkline from './PriceSparkline';

const RARITY_COLORS: Record<string, string> = {
  common: 'text-white/50',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-casino-gold',
};

interface Props {
  itemId: string;
  onClose: () => void;
  onBuy: (itemId: string, quantity: number) => void;
}

export default function MarketItemDetail({ itemId, onClose, onBuy }: Props) {
  const [item, setItem] = useState<MarketItemDetailType | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    market.getItem(itemId).then(setItem).catch(() => {});
  }, [itemId]);

  if (!item) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="text-white/40">Loading...</div>
      </div>
    );
  }

  const totalCost = item.current_price_cents * quantity;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="card-panel p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{item.icon}</span>
            <div>
              <div className="text-white font-bold text-lg">{item.name}</div>
              <div className={`text-xs uppercase tracking-wider font-bold ${RARITY_COLORS[item.rarity]}`}>
                {item.rarity} {item.category}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl cursor-pointer">
            &times;
          </button>
        </div>

        <p className="text-white/50 text-sm mb-4">{item.description}</p>

        <div className="bg-casino-dark rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-white/40">Current Price</div>
              <div className="text-casino-gold font-bold text-xl">{formatCents(item.current_price_cents)}</div>
            </div>
            <TrendIndicator percent={item.trend_percent} size="md" />
          </div>
          <div className="flex justify-center mt-2">
            <PriceSparkline data={item.price_history} width={280} height={60} />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>12h ago</span>
            <span>Now</span>
          </div>
        </div>

        <div className={`grid ${item.rent_rate > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4 text-sm`}>
          <div>
            <div className="text-xs text-white/40">Base Price</div>
            <div className="text-white">{formatCents(item.base_price_cents)}</div>
          </div>
          <div>
            <div className="text-xs text-white/40">Volatility</div>
            <div className="text-white">{(item.volatility * 100).toFixed(0)}%</div>
          </div>
          {item.rent_rate > 0 && (
            <div>
              <div className="text-xs text-white/40">Rent Rate</div>
              <div className="text-emerald-400 font-bold">{(item.rent_rate * 100).toFixed(2)}%/hr</div>
            </div>
          )}
        </div>

        {/* Quantity selector */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-white/50 text-sm">Qty:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-casino-card border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors cursor-pointer flex items-center justify-center font-bold"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1 && v <= 999) setQuantity(v);
              }}
              className="w-16 h-8 rounded-lg bg-casino-dark border border-white/10 text-white text-center text-sm font-bold focus:outline-none focus:border-casino-gold/40"
            />
            <button
              onClick={() => setQuantity(Math.min(999, quantity + 1))}
              className="w-8 h-8 rounded-lg bg-casino-card border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors cursor-pointer flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
          <div className="flex gap-1 ml-auto">
            {[5, 10, 25].map(q => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                  quantity === q
                    ? 'bg-casino-gold/20 text-casino-gold border border-casino-gold/30'
                    : 'bg-casino-card text-white/40 border border-white/10 hover:text-white/60'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onBuy(item.id, quantity)}
          className="btn-primary w-full"
        >
          Buy {quantity}x for {formatCents(totalCost)}
        </button>
      </motion.div>
    </div>
  );
}
