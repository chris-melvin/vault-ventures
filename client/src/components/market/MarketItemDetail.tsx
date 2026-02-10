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
  onBuy: (itemId: string) => void;
}

export default function MarketItemDetail({ itemId, onClose, onBuy }: Props) {
  const [item, setItem] = useState<MarketItemDetailType | null>(null);

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

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <div className="text-xs text-white/40">Base Price</div>
            <div className="text-white">{formatCents(item.base_price_cents)}</div>
          </div>
          <div>
            <div className="text-xs text-white/40">Volatility</div>
            <div className="text-white">{(item.volatility * 100).toFixed(0)}%</div>
          </div>
        </div>

        <button
          onClick={() => onBuy(item.id)}
          className="btn-primary w-full"
        >
          Buy for {formatCents(item.current_price_cents)}
        </button>
      </motion.div>
    </div>
  );
}
