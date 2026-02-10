import { motion } from 'motion/react';
import type { CardData } from '@shared/types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/constants';
import CardPipLayout from './CardPipLayout';
import FaceCardArt from './FaceCardArt';

interface CardProps {
  card: CardData;
  index: number;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
  /**
   * Controls whether the card face or back is displayed.
   * When false, the card back is shown. When it transitions to true,
   * a smooth 3D flip animation reveals the face.
   * Defaults to true.
   */
  showFace?: boolean;
}

const CARD_SIZES = {
  sm: { w: 'w-14', h: 'h-20', corner: 'text-[9px]', cornerSuit: 'text-[7px]', ace: 'text-xl' },
  md: { w: 'w-20', h: 'h-28', corner: 'text-xs', cornerSuit: 'text-[10px]', ace: 'text-3xl' },
  lg: { w: 'w-28', h: 'h-40', corner: 'text-sm', cornerSuit: 'text-xs', ace: 'text-5xl' },
};

function CardFace({ card, size = 'md' }: { card: CardData; size: 'sm' | 'md' | 'lg' }) {
  const color = SUIT_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const s = CARD_SIZES[size];
  const isFace = ['J', 'Q', 'K'].includes(card.rank);
  const isAce = card.rank === 'A';
  const isNumber = !isFace && !isAce && card.rank !== '?';

  return (
    <div
      className={`${s.w} ${s.h} rounded-lg border shadow-xl relative overflow-hidden`}
      style={{
        backgroundColor: '#fafafa',
        borderColor: 'rgba(0,0,0,0.15)',
      }}
    >
      {/* Top-left corner */}
      <div
        className={`absolute top-1 left-1.5 ${s.corner} font-bold leading-none`}
        style={{ color }}
      >
        <div>{card.rank}</div>
        <div className={s.cornerSuit}>{suitSymbol}</div>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isNumber && <CardPipLayout rank={card.rank} suit={card.suit} size={size} />}
        {isFace && <FaceCardArt rank={card.rank} suit={card.suit} size={size} />}
        {isAce && (
          <span className={`${s.ace} select-none`} style={{ color }}>
            {suitSymbol}
          </span>
        )}
      </div>

      {/* Bottom-right corner (rotated 180) */}
      <div
        className={`absolute bottom-1 right-1.5 ${s.corner} font-bold leading-none rotate-180`}
        style={{ color }}
      >
        <div>{card.rank}</div>
        <div className={s.cornerSuit}>{suitSymbol}</div>
      </div>
    </div>
  );
}

function CardBack({ size = 'md' }: { size: 'sm' | 'md' | 'lg' }) {
  const s = CARD_SIZES[size];
  return (
    <div
      className={`${s.w} ${s.h} rounded-lg border shadow-xl overflow-hidden card-back-pattern`}
      style={{ borderColor: '#34495e' }}
    />
  );
}

export default function Card({ card, index, delay = 0, size = 'md', showFace = true }: CardProps) {
  const isHidden = card.rank === '?';
  const faceVisible = showFace && !isHidden;

  return (
    <motion.div
      initial={{ x: 200, y: -100, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200, delay }}
      className="relative"
      style={{ zIndex: index, perspective: 800 }}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: faceVisible ? 0 : 180 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front face */}
        <div style={{ backfaceVisibility: 'hidden' }}>
          <CardFace card={card} size={size} />
        </div>
        {/* Back face */}
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <CardBack size={size} />
        </div>
      </motion.div>
    </motion.div>
  );
}
