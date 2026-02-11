import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { applyPrestigeBonus } from './prestigeService.js';
import { SIC_BO_PAYOUTS, type SicBoBetType, type SicBoRollResult } from '../../../shared/types.ts';

function diceFromHash(hash: string): [number, number, number] {
  const d1 = (parseInt(hash.substring(0, 8), 16) % 6) + 1;
  const d2 = (parseInt(hash.substring(8, 16), 16) % 6) + 1;
  const d3 = (parseInt(hash.substring(16, 24), 16) % 6) + 1;
  return [d1, d2, d3];
}

function getWinningBets(dice: [number, number, number]): Set<SicBoBetType> {
  const [d1, d2, d3] = dice;
  const total = d1 + d2 + d3;
  const isTriple = d1 === d2 && d2 === d3;
  const winners = new Set<SicBoBetType>();

  // Big/Small (loses on triple)
  if (!isTriple) {
    if (total >= 11 && total <= 17) winners.add('big');
    if (total >= 4 && total <= 10) winners.add('small');
    if (total % 2 === 1) winners.add('odd');
    if (total % 2 === 0) winners.add('even');
  }

  // Total bets
  if (total >= 4 && total <= 17) {
    winners.add(`total_${total}` as SicBoBetType);
  }

  // Double bets (at least 2 of the same)
  for (let n = 1; n <= 6; n++) {
    const count = [d1, d2, d3].filter(d => d === n).length;
    if (count >= 2) winners.add(`double_${n}` as SicBoBetType);
  }

  // Triple bets
  if (isTriple) {
    winners.add(`triple_${d1}` as SicBoBetType);
    winners.add('any_triple');
  }

  // Single bets (pays per match count)
  for (let n = 1; n <= 6; n++) {
    const count = [d1, d2, d3].filter(d => d === n).length;
    if (count > 0) winners.add(`single_${n}` as SicBoBetType);
  }

  return winners;
}

export function rollSicBo(userId: number, bets: Partial<Record<SicBoBetType, number>>): SicBoRollResult {
  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  const hash = hmacResult(serverSeed, clientSeed, nonce);
  const dice = diceFromHash(hash);
  const total = dice[0] + dice[1] + dice[2];

  const winningBetTypes = getWinningBets(dice);
  const totalBetCents = Object.values(bets).reduce((sum, v) => sum + (v || 0), 0);

  let payoutCents = 0;
  const winningBets: SicBoBetType[] = [];

  for (const [betType, amount] of Object.entries(bets) as [SicBoBetType, number][]) {
    if (!amount || !winningBetTypes.has(betType)) continue;

    winningBets.push(betType);

    // Singles pay per match count (1x, 2x, or 3x the base payout)
    if (betType.startsWith('single_')) {
      const n = parseInt(betType.split('_')[1]);
      const matchCount = dice.filter(d => d === n).length;
      payoutCents += amount + amount * matchCount; // return bet + matchCount * bet
    } else {
      payoutCents += amount + amount * SIC_BO_PAYOUTS[betType];
    }
  }

  // Apply prestige bonus
  if (payoutCents > totalBetCents) {
    payoutCents = applyPrestigeBonus(userId, payoutCents, totalBetCents);
  }

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(totalBetCents, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -totalBetCents, 'BET', 'sicbo');

    if (payoutCents > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(payoutCents, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, payoutCents, 'WIN', 'sicbo');
    }

    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'sicbo', serverSeed, clientSeed, nonce, JSON.stringify({ dice, total, bets, payoutCents, winningBets }));

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  updateStats(userId, { wagered: totalBetCents, won: payoutCents, isWin: payoutCents > 0, gameType: 'sicbo' });
  const newAchievements = checkAchievements(userId);

  return {
    dice,
    total,
    bets,
    total_bet_cents: totalBetCents,
    winning_bets: winningBets,
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
