import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult, hashToNumber } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { SlotSymbol, SLOT_SYMBOLS, SLOT_PAYOUTS, SlotsSpinResult } from '../../../shared/types.ts';

const REEL_LENGTH = 16;
const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;

// Generate weighted reel strips (higher-value symbols appear less)
function generateReelStrip(): SlotSymbol[] {
  const weights: [SlotSymbol, number][] = [
    ['cherry', 4], ['lemon', 3], ['orange', 3], ['grape', 2],
    ['watermelon', 2], ['bell', 1], ['star', 1], ['seven', 0], ['diamond', 0],
  ];

  const strip: SlotSymbol[] = [];
  for (const [sym, count] of weights) {
    for (let i = 0; i < count; i++) strip.push(sym);
  }
  // Fill remaining with low-value
  while (strip.length < REEL_LENGTH) strip.push('cherry');
  return strip;
}

const REEL_STRIPS: SlotSymbol[][] = Array.from({ length: REEL_COUNT }, () => generateReelStrip());

// Ensure seven and diamond exist on some reels
REEL_STRIPS[0][15] = 'seven';
REEL_STRIPS[1][14] = 'seven';
REEL_STRIPS[2][13] = 'seven';
REEL_STRIPS[3][12] = 'diamond';
REEL_STRIPS[4][11] = 'diamond';

function getVisibleSymbols(reelIndex: number, stopPosition: number): SlotSymbol[] {
  const strip = REEL_STRIPS[reelIndex];
  const symbols: SlotSymbol[] = [];
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    symbols.push(strip[(stopPosition + i) % REEL_LENGTH]);
  }
  return symbols;
}

function checkPaylines(allSymbols: SlotSymbol[][]): { line: number; symbols: SlotSymbol[]; multiplier: number }[] {
  const paylines: { line: number; symbols: SlotSymbol[]; multiplier: number }[] = [];

  // Check middle row (main payline)
  const middleRow = allSymbols.map(col => col[1]);
  const counts = new Map<SlotSymbol, number>();
  for (const sym of middleRow) {
    counts.set(sym, (counts.get(sym) || 0) + 1);
  }

  for (const [sym, count] of counts) {
    if (count >= 3) {
      paylines.push({
        line: 0,
        symbols: middleRow,
        multiplier: SLOT_PAYOUTS[sym] * (count - 2), // 3=1x, 4=2x, 5=3x of base
      });
    }
  }

  // Check top row
  const topRow = allSymbols.map(col => col[0]);
  const topCounts = new Map<SlotSymbol, number>();
  for (const sym of topRow) {
    topCounts.set(sym, (topCounts.get(sym) || 0) + 1);
  }
  for (const [sym, count] of topCounts) {
    if (count >= 3) {
      paylines.push({ line: 1, symbols: topRow, multiplier: SLOT_PAYOUTS[sym] * (count - 2) });
    }
  }

  // Check bottom row
  const bottomRow = allSymbols.map(col => col[2]);
  const bottomCounts = new Map<SlotSymbol, number>();
  for (const sym of bottomRow) {
    bottomCounts.set(sym, (bottomCounts.get(sym) || 0) + 1);
  }
  for (const [sym, count] of bottomCounts) {
    if (count >= 3) {
      paylines.push({ line: 2, symbols: bottomRow, multiplier: SLOT_PAYOUTS[sym] * (count - 2) });
    }
  }

  return paylines;
}

function detectNearMiss(allSymbols: SlotSymbol[][]): boolean {
  const middleRow = allSymbols.map(col => col[1]);
  // Near miss: first 2+ reels match on middle payline but not enough for a win
  if (middleRow[0] === middleRow[1] && middleRow[0] !== middleRow[2]) {
    return true;
  }
  return false;
}

export function spinSlots(userId: number, amountCents: number): SlotsSpinResult {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  // Generate stops
  const reelStops: number[] = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    const hash = hmacResult(serverSeed, `${clientSeed}:reel${i}`, nonce);
    reelStops.push(hashToNumber(hash, REEL_LENGTH));
  }

  const allSymbols = reelStops.map((stop, i) => getVisibleSymbols(i, stop));
  const paylines = checkPaylines(allSymbols);
  const isNearMiss = paylines.length === 0 && detectNearMiss(allSymbols);

  const totalMultiplier = paylines.reduce((sum, p) => sum + p.multiplier, 0);
  const payoutCents = amountCents * totalMultiplier;

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(amountCents, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -amountCents, 'BET', 'slots');

    if (payoutCents > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payoutCents, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payoutCents, 'WIN', 'slots');
    }

    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'slots', serverSeed, clientSeed, nonce, JSON.stringify({ reelStops, allSymbols, paylines }));

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  // Achievement tracking
  updateStats(userId, { wagered: amountCents, won: payoutCents, isWin: payoutCents > 0, gameType: 'slots' });
  const newAchievements = checkAchievements(userId);

  return {
    reel_stops: reelStops,
    symbols: allSymbols,
    paylines,
    is_near_miss: isNearMiss,
    payout_cents: payoutCents,
    new_balance_cents: newAchievements.length > 0
      ? (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents
      : newBalance,
    server_seed_hash: hashSeed(serverSeed),
    client_seed: clientSeed,
    nonce,
    new_achievements: newAchievements.length > 0 ? newAchievements : undefined,
  };
}
