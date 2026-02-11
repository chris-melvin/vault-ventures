import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult, hashToNumber } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { applyPrestigeBonus } from './prestigeService.js';
import { SlotSymbol, SLOT_SYMBOLS, SLOT_PAYOUTS, SlotsSpinResult } from '../../../shared/types.ts';
import { REEL_STRIPS, REEL_COUNT, REEL_LENGTH, VISIBLE_ROWS, getVisibleSymbols } from '../../../shared/slots.ts';

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
  const rawPayout = amountCents * totalMultiplier;
  const payoutCents = rawPayout > 0 ? applyPrestigeBonus(userId, rawPayout, amountCents) : 0;

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
