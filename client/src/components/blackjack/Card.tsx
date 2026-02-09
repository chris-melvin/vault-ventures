import { motion } from 'motion/react';
import type { CardData } from '@shared/types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/constants';

interface CardProps {
  card: CardData;
  index: number;
  delay?: number;
}

export default function Card({ card, index, delay = 0 }: CardProps) {
  const isHidden = card.rank === '?';
  const color = isHidden ? '#ffffff' : (SUIT_COLORS[card.suit] || '#ffffff');
  const suitSymbol = isHidden ? '' : SUIT_SYMBOLS[card.suit];

  return (
    <motion.div
      initial={{ x: 200, y: -100, opacity: 0, rotateY: 180 }}
      animate={{ x: 0, y: 0, opacity: 1, rotateY: 0 }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 200,
        delay: index * 0.15 + delay,
      }}
      className="relative"
      style={{ zIndex: index, perspective: 800 }}
    >
      <div
        className="w-20 h-28 rounded-lg border shadow-xl flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: isHidden ? '#2c3e50' : '#fafafa',
          borderColor: isHidden ? '#34495e' : 'rgba(0,0,0,0.1)',
        }}
      >
        {isHidden ? (
          // Card back
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-14 h-22 rounded border-2 border-white/20 flex items-center justify-center">
              <span className="text-white/30 text-2xl font-serif">?</span>
            </div>
          </div>
        ) : (
          // Card face
          <>
            <div
              className="absolute top-1.5 left-2 text-xs font-bold leading-none"
              style={{ color }}
            >
              <div>{card.rank}</div>
              <div className="text-[10px]">{suitSymbol}</div>
            </div>
            <div className="text-3xl select-none" style={{ color }}>
              {suitSymbol}
            </div>
            <div
              className="absolute bottom-1.5 right-2 text-xs font-bold leading-none rotate-180"
              style={{ color }}
            >
              <div>{card.rank}</div>
              <div className="text-[10px]">{suitSymbol}</div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
