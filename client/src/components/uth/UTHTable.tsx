import { AnimatePresence, motion } from 'motion/react';
import Card from '../cards/Card';
import UTHBetAreas from './UTHBetAreas';
import type { UTHState } from '@shared/types';

interface UTHTableProps {
  game: UTHState;
}

export default function UTHTable({ game }: UTHTableProps) {
  const isShowdown = game.phase === 'showdown';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Dealer cards */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/50 text-sm uppercase tracking-wider">Dealer</span>
        <div className="flex -space-x-6">
          {game.dealer_hand.map((card, i) => (
            <Card
              key={`dealer-${i}`}
              card={card}
              index={i}
              size="md"
              flipAnimation={isShowdown}
            />
          ))}
        </div>
        {isShowdown && game.dealer_hand_name && (
          <span className="text-white/70 text-sm font-medium mt-1">{game.dealer_hand_name}</span>
        )}
      </div>

      {/* Community cards */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/40 text-xs uppercase tracking-wider">Community</span>
        <div className="flex gap-1.5 min-h-[72px] items-center">
          <AnimatePresence>
            {game.community_cards.map((card, i) => (
              <motion.div
                key={`comm-${i}`}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ type: 'spring', damping: 15, delay: i * 0.15 }}
              >
                <Card card={card} index={i} size="sm" delay={0} />
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Placeholder slots for unrevealed community cards */}
          {Array.from({ length: 5 - game.community_cards.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-14 h-20 rounded-lg border border-dashed border-white/10"
            />
          ))}
        </div>
      </div>

      {/* Player cards */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/50 text-sm uppercase tracking-wider">Your Hand</span>
        <div className="flex -space-x-6">
          {game.player_hand.map((card, i) => (
            <Card key={`player-${i}`} card={card} index={i} size="md" delay={0.3} />
          ))}
        </div>
        {isShowdown && game.player_hand_name && (
          <span className="text-casino-gold text-sm font-bold mt-1">{game.player_hand_name}</span>
        )}
      </div>

      {/* Bet areas */}
      <UTHBetAreas bets={game.bets} />
    </div>
  );
}
