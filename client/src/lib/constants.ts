export const API_BASE = '/api';

export const ALL_CHIP_VALUES = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000] as const;

// Legacy alias — kept for imports that don't need dynamic chips
export const CHIP_VALUES = ALL_CHIP_VALUES;

export const CHIP_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  100: { bg: '#ffffff', border: '#cccccc', text: '#333333' },
  500: { bg: '#e74c3c', border: '#c0392b', text: '#ffffff' },
  1000: { bg: '#2980b9', border: '#2471a3', text: '#ffffff' },
  5000: { bg: '#2ecc71', border: '#27ae60', text: '#ffffff' },
  10000: { bg: '#f39c12', border: '#e67e22', text: '#000000' },
  50000: { bg: '#8e44ad', border: '#7d3c98', text: '#ffffff' },
  100000: { bg: '#c0392b', border: '#a93226', text: '#ffffff' },
  500000: { bg: '#1a5276', border: '#154360', text: '#ffffff' },
  1000000: { bg: '#1e8449', border: '#196f3d', text: '#ffffff' },
  5000000: { bg: '#1c1c1c', border: '#d4af37', text: '#d4af37' },
};

/** Pick ~7 chips that give good spread for the user's current balance */
export function getVisibleChips(balance: number): number[] {
  const affordable = ALL_CHIP_VALUES.filter((v) => v <= balance);
  if (affordable.length <= 7) return [...affordable];
  // Always include $1, then the top 6 affordable
  return [100, ...affordable.slice(-6)];
}

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
  if (dollars >= 1000) return `$${dollars / 1000}K`;
  return `$${dollars}`;
}
