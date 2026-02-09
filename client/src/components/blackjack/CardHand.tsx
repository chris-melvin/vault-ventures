import { AnimatePresence } from 'motion/react';
import Card from './Card';
import type { CardData } from '@shared/types';

interface CardHandProps {
  cards: CardData[];
  label: string;
  value?: number | null;
  delay?: number;
}

export default function CardHand({ cards, label, value, delay = 0 }: CardHandProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-sm uppercase tracking-wider">{label}</span>
        {value !== null && value !== undefined && (
          <span className={`font-bold text-lg ${
            value === 21 ? 'text-casino-gold' : value > 21 ? 'text-casino-red' : 'text-white'
          }`}>
            {value}
          </span>
        )}
      </div>
      <div className="flex -space-x-6">
        <AnimatePresence>
          {cards.map((card, i) => (
            <Card key={`${card.suit}-${card.rank}-${i}`} card={card} index={i} delay={delay} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
