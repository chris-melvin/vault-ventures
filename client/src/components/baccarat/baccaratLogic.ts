import type { CardData, Rank } from '@shared/types';

function cardValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  return parseInt(rank);
}

export function baccaratHandValue(hand: CardData[]): number {
  return hand.reduce((sum, c) => sum + cardValue(c.rank), 0) % 10;
}
