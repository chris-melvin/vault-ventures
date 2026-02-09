import type { CardData, Rank } from '@shared/types';

function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return parseInt(rank);
}

export function handValue(hand: CardData[]): number {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === '?') continue;
    value += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

export function isBlackjack(hand: CardData[]): boolean {
  return hand.length === 2 && handValue(hand) === 21;
}

export function isBust(hand: CardData[]): boolean {
  return handValue(hand) > 21;
}
