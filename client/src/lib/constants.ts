export const API_BASE = '/api';

export const CHIP_VALUES = [100, 500, 1000, 5000, 10000] as const;

export const CHIP_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  100: { bg: '#ffffff', border: '#cccccc', text: '#333333' },
  500: { bg: '#e74c3c', border: '#c0392b', text: '#ffffff' },
  1000: { bg: '#2980b9', border: '#2471a3', text: '#ffffff' },
  5000: { bg: '#2ecc71', border: '#27ae60', text: '#ffffff' },
  10000: { bg: '#f39c12', border: '#e67e22', text: '#000000' },
};

export const SLOT_SYMBOL_EMOJIS: Record<string, string> = {
  cherry: '\u{1F352}',
  lemon: '\u{1F34B}',
  orange: '\u{1F34A}',
  grape: '\u{1F347}',
  watermelon: '\u{1F349}',
  bell: '\u{1F514}',
  star: '\u2B50',
  seven: '7\uFE0F\u20E3',
  diamond: '\u{1F48E}',
};

export const PINBALL_SYMBOL_EMOJIS: Record<string, string> = {
  cherry: '\u{1F352}',
  lemon: '\u{1F34B}',
  bell: '\u{1F514}',
  star: '\u2B50',
  seven: '7\uFE0F\u20E3',
  diamond: '\u{1F48E}',
  pinball: '\u{1F3B1}',
};

export const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

export const SUIT_COLORS: Record<string, string> = {
  hearts: '#e74c3c',
  diamonds: '#e74c3c',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function formatChipLabel(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars}`;
}
