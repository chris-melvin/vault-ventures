import { AnimatePresence } from 'motion/react';
import Card from './Card';
import type { CardData } from '@shared/types';

interface CardHandProps {
  cards: CardData[];
  label: string;
  value?: number | null;
  delay?: number;
  size?: 'sm' | 'md' | 'lg';
  /** Number of cards to display (for dealing animation). Defaults to cards.length. */
  dealtCount?: number;
  /** Number of cards shown face-up from the left. Defaults to dealtCount. */
  flippedCount?: number;
  /** Highlight this hand as active (gold border glow) */
  active?: boolean;
}

const OVERLAP = { sm: '-space-x-4', md: '-space-x-6', lg: '-space-x-8' };

export default function CardHand({
  cards,
  label,
  value,
  delay = 0,
  size = 'md',
  dealtCount,
  flippedCount,
  active,
}: CardHandProps) {
  const inDealingMode = dealtCount !== undefined;
  const numDealt = dealtCount ?? cards.length;
  const numFlipped = flippedCount ?? numDealt;
  const visibleCards = cards.slice(0, numDealt);
  const allRevealed = numFlipped >= numDealt && numDealt > 0;

  return (
    <div className={`flex flex-col items-center gap-2 ${active ? 'ring-2 ring-casino-gold/60 rounded-xl p-2 -m-2' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm uppercase tracking-wider">{label}</span>
        {allRevealed && value !== null && value !== undefined && (
          <span className={`font-bold text-lg ${
            value === 21 ? 'text-casino-gold' : value > 21 ? 'text-casino-red' : 'text-white'
          }`}>
            {value}
          </span>
        )}
      </div>
      <div className={`flex ${OVERLAP[size]}`}>
        <AnimatePresence>
          {visibleCards.map((card, i) => (
            <Card
              key={i}
              card={card}
              index={i}
              delay={inDealingMode ? 0 : i * 0.15 + delay}
              size={size}
              showFace={i < numFlipped}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
