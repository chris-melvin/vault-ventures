import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult, hashToNumber } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { WHEEL_SEGMENTS, WHEEL_SEGMENT_COUNT, getSymbolConfig, type WheelSymbol, type WheelSpinResult } from '../../../shared/types.ts';

export function spinWheel(userId: number, bets: Partial<Record<WheelSymbol, number>>): WheelSpinResult {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const hash = hmacResult(serverSeed, clientSeed, nonce);
  const targetSegment = hashToNumber(hash, WHEEL_SEGMENT_COUNT);
  const winningSymbol = WHEEL_SEGMENTS[targetSegment];

  const totalBetCents = Object.values(bets).reduce((sum, v) => sum + (v || 0), 0);
  const winningBet = bets[winningSymbol] || 0;
  const config = getSymbolConfig(winningSymbol);
  // Payout = bet returned + N × bet
  const payoutCents = winningBet > 0 ? winningBet + winningBet * config.payout : 0;

  const run = db.transaction(() => {
    // Deduct total of all bets
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(totalBetCents, userId);

    db.prepare(
      'INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)'
    ).run(userId, -totalBetCents, 'BET', 'wheel');

    // Credit win
    if (payoutCents > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payoutCents, userId);

      db.prepare(
        'INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)'
      ).run(userId, payoutCents, 'WIN', 'wheel');
    }

    // Log game
    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'wheel', serverSeed, clientSeed, nonce, JSON.stringify({ targetSegment, winningSymbol, bets, payoutCents }));

    const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };

    return user.balance_cents;
  });

  const newBalance = run();

  // Achievement tracking
  updateStats(userId, { wagered: totalBetCents, won: payoutCents, isWin: payoutCents > 0, gameType: 'wheel' });
  const newAchievements = checkAchievements(userId);

  return {
    target_segment: targetSegment,
    winning_symbol: winningSymbol,
    bets,
    total_bet_cents: totalBetCents,
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
