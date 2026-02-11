import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult, hashToNumber } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { applyPrestigeBonus } from './prestigeService.js';
import {
  ROULETTE_PAYOUTS, ROULETTE_RED_NUMBERS,
  type RouletteBet, type RouletteSpinResult,
} from '../../../shared/types.ts';

function getColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green';
  if (ROULETTE_RED_NUMBERS.includes(num)) return 'red';
  return 'black';
}

export function spinRoulette(userId: number, bets: RouletteBet[]): RouletteSpinResult {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const hash = hmacResult(serverSeed, clientSeed, nonce);
  const winningNumber = hashToNumber(hash, 37); // 0-36
  const winningColor = getColor(winningNumber);

  const totalBetCents = bets.reduce((sum, b) => sum + b.amount_cents, 0);
  let payoutCents = 0;
  const winningBetIndices: number[] = [];

  bets.forEach((bet, index) => {
    if (bet.numbers.includes(winningNumber)) {
      winningBetIndices.push(index);
      payoutCents += bet.amount_cents + bet.amount_cents * ROULETTE_PAYOUTS[bet.type];
    }
  });

  // Apply prestige bonus
  if (payoutCents > totalBetCents) {
    payoutCents = applyPrestigeBonus(userId, payoutCents, totalBetCents);
  }

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(totalBetCents, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -totalBetCents, 'BET', 'roulette');

    if (payoutCents > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payoutCents, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payoutCents, 'WIN', 'roulette');
    }

    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'roulette', serverSeed, clientSeed, nonce, JSON.stringify({
      winningNumber, winningColor, bets: bets.map(b => ({ type: b.type, amount: b.amount_cents })), payoutCents,
    }));

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  updateStats(userId, { wagered: totalBetCents, won: payoutCents, isWin: payoutCents > 0, gameType: 'roulette' });
  const newAchievements = checkAchievements(userId);

  return {
    winning_number: winningNumber,
    winning_color: winningColor,
    bets,
    total_bet_cents: totalBetCents,
    winning_bets: winningBetIndices,
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
