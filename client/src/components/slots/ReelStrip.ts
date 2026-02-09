import type { SlotSymbol } from '@shared/types';

export const REEL_SYMBOL_COUNT = 16;
export const VISIBLE_ROWS = 3;

// Visual reel strips (what the player sees spinning)
export const VISUAL_STRIPS: SlotSymbol[][] = [
  ['cherry', 'lemon', 'orange', 'grape', 'cherry', 'watermelon', 'bell', 'cherry', 'lemon', 'orange', 'grape', 'cherry', 'watermelon', 'star', 'cherry', 'seven'],
  ['lemon', 'cherry', 'grape', 'orange', 'cherry', 'bell', 'lemon', 'watermelon', 'cherry', 'orange', 'grape', 'cherry', 'star', 'lemon', 'seven', 'cherry'],
  ['orange', 'grape', 'cherry', 'lemon', 'watermelon', 'cherry', 'orange', 'bell', 'cherry', 'grape', 'lemon', 'cherry', 'star', 'seven', 'cherry', 'diamond'],
  ['grape', 'cherry', 'lemon', 'orange', 'cherry', 'watermelon', 'grape', 'cherry', 'bell', 'lemon', 'cherry', 'star', 'diamond', 'cherry', 'orange', 'grape'],
  ['cherry', 'orange', 'lemon', 'grape', 'watermelon', 'cherry', 'bell', 'orange', 'cherry', 'lemon', 'star', 'diamond', 'cherry', 'grape', 'cherry', 'lemon'],
];

export function getVisibleSymbols(reelIndex: number, stopPosition: number): SlotSymbol[] {
  const strip = VISUAL_STRIPS[reelIndex];
  const symbols: SlotSymbol[] = [];
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    symbols.push(strip[(stopPosition + i) % REEL_SYMBOL_COUNT]);
  }
  return symbols;
}
