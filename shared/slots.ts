import type { SlotSymbol, PinballSymbol } from './types.ts';

export const REEL_LENGTH = 16;
export const REEL_COUNT = 5;
export const VISIBLE_ROWS = 3;

// Canonical reel strips — single source of truth for server & client
export const REEL_STRIPS: SlotSymbol[][] = [
  ['cherry', 'lemon', 'orange', 'grape', 'cherry', 'watermelon', 'bell', 'cherry', 'lemon', 'orange', 'grape', 'cherry', 'watermelon', 'star', 'cherry', 'seven'],
  ['lemon', 'cherry', 'grape', 'orange', 'cherry', 'bell', 'lemon', 'watermelon', 'cherry', 'orange', 'grape', 'cherry', 'star', 'lemon', 'seven', 'cherry'],
  ['orange', 'grape', 'cherry', 'lemon', 'watermelon', 'cherry', 'orange', 'bell', 'cherry', 'grape', 'lemon', 'cherry', 'star', 'seven', 'cherry', 'diamond'],
  ['grape', 'cherry', 'lemon', 'orange', 'cherry', 'watermelon', 'grape', 'cherry', 'bell', 'lemon', 'cherry', 'star', 'diamond', 'cherry', 'orange', 'grape'],
  ['cherry', 'orange', 'lemon', 'grape', 'watermelon', 'cherry', 'bell', 'orange', 'cherry', 'lemon', 'star', 'diamond', 'cherry', 'grape', 'cherry', 'lemon'],
];

export function getVisibleSymbols(reelIndex: number, stopPosition: number): SlotSymbol[] {
  const strip = REEL_STRIPS[reelIndex];
  const symbols: SlotSymbol[] = [];
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    symbols.push(strip[(stopPosition + i) % REEL_LENGTH]);
  }
  return symbols;
}
