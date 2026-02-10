import { AnimatePresence, motion } from 'motion/react';
import Card from '../cards/Card';
import UTHBetAreas from './UTHBetAreas';
import type { UTHState } from '@shared/types';

interface UTHTableProps {
  game: UTHState;
  /** Reveal counts per position for dealing animation */
  playerDealt?: number;
  playerFlipped?: number;
  dealerDealt?: number;
  dealerFlipped?: number;
  communityDealt?: number;
  communityFlipped?: number;
}

export default function UTHTable({
  game,
  playerDealt,
  playerFlipped,
  dealerDealt,
  dealerFlipped,
  communityDealt,
  communityFlipped,
}: UTHTableProps) {
  const isShowdown = game.phase === 'showdown';

  const inDealingMode = playerDealt !== undefined || dealerDealt !== undefined || communityDealt !== undefined;

  // Determine how many cards to show and flip per position
  const pDealt = playerDealt ?? game.player_hand.length;
  const pFlipped = playerFlipped ?? pDealt;
  const dDealt = dealerDealt ?? game.dealer_hand.length;
  const dFlipped = dealerFlipped ?? dDealt;
  const cDealt = communityDealt ?? game.community_cards.length;
  const cFlipped = communityFlipped ?? cDealt;

  const visiblePlayerCards = game.player_hand.slice(0, pDealt);
  const visibleDealerCards = game.dealer_hand.slice(0, dDealt);
  const visibleCommunityCards = game.community_cards.slice(0, cDealt);

  // Only show hand names when all cards are revealed
  const dealerRevealed = dFlipped >= dDealt && dDealt > 0;
  const playerRevealed = pFlipped >= pDealt && pDealt > 0;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Dealer cards */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/50 text-sm uppercase tracking-wider">Dealer</span>
        <div className="flex -space-x-6">
          {visibleDealerCards.map((card, i) => (
            <Card
              key={i}
              card={card}
              index={i}
              size="md"
              delay={inDealingMode ? 0 : i * 0.15}
              showFace={i < dFlipped}
            />
          ))}
        </div>
        {isShowdown && dealerRevealed && game.dealer_hand_name && (
          <span className="text-white/70 text-sm font-medium mt-1">{game.dealer_hand_name}</span>
        )}
      </div>

      {/* Community cards */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white/40 text-xs uppercase tracking-wider">Community</span>
        <div className="flex gap-1.5 min-h-[72px] items-center">
          <AnimatePresence>
            {visibleCommunityCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: i < cFlipped ? 0 : 180 }}
                transition={{ type: 'spring', damping: 15, delay: inDealingMode ? 0 : i * 0.15 }}
                style={{ perspective: 800, transformStyle: 'preserve-3d' }}
              >
                <Card card={card} index={i} size="sm" delay={0} showFace={i < cFlipped} />
              </motion.div>
            ))}
          </AnimatePresence>
          {/* Placeholder slots for unrevealed community cards */}
          {Array.from({ length: 5 - visibleCommunityCards.length }).map((_, i) => (
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
          {visiblePlayerCards.map((card, i) => (
            <Card
              key={i}
              card={card}
              index={i}
              size="md"
              delay={inDealingMode ? 0 : 0.3}
              showFace={i < pFlipped}
            />
          ))}
        </div>
        {isShowdown && playerRevealed && game.player_hand_name && (
          <span className="text-casino-gold text-sm font-bold mt-1">{game.player_hand_name}</span>
        )}
      </div>

      {/* Bet areas */}
      <UTHBetAreas bets={game.bets} />
    </div>
  );
}
