import db from '../db/database.js';
import { generateSeed, hashSeed, hmacResult, hashToNumber } from './rng.js';
import { updateStats, checkAchievements } from './achievementService.js';
import { applyPrestigeBonus } from './prestigeService.js';
import {
  PinballSymbol,
  PINBALL_REEL_STRIPS,
  PINBALL_REEL_LENGTH,
  PINBALL_PAYOUTS,
  PINBALL_POCKET_MULTIPLIERS,
  PinballSpinResult,
  PinballBonusBallResult,
} from '../../../shared/types.ts';

const REEL_COUNT = 3;
const VISIBLE_ROWS = 3;
const PEG_ROWS = 8;

function getVisibleSymbols(reelIndex: number, stopPosition: number): PinballSymbol[] {
  const strip = PINBALL_REEL_STRIPS[reelIndex];
  const symbols: PinballSymbol[] = [];
  for (let i = 0; i < VISIBLE_ROWS; i++) {
    symbols.push(strip[(stopPosition + i) % PINBALL_REEL_LENGTH]);
  }
  return symbols;
}

function getBallsForLevel(level: number): number {
  if (level === 1) return 1;
  if (level === 2) return 2;
  return 5; // level 3
}

// Weighted pocket selection: edges more likely, center (100x) rare
const POCKET_WEIGHTS = [20, 15, 10, 5, 1, 5, 10, 15, 20]; // index 4 = 100x pocket
const TOTAL_POCKET_WEIGHT = POCKET_WEIGHTS.reduce((a, b) => a + b, 0);

function selectPocket(hashValue: number): number {
  let remaining = hashValue % TOTAL_POCKET_WEIGHT;
  for (let i = 0; i < POCKET_WEIGHTS.length; i++) {
    remaining -= POCKET_WEIGHTS[i];
    if (remaining < 0) return i;
  }
  return 0;
}

function generateBallPath(pocketIndex: number, seed: string, ballIndex: number, nonce: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  // Start position: centered at top
  let x = 0.5;
  path.push({ x, y: 0 });

  // Generate path through peg rows
  for (let row = 0; row < PEG_ROWS; row++) {
    const hash = hmacResult(seed, `ball${ballIndex}:row${row}`, nonce);
    const drift = (hashToNumber(hash, 100) / 100) * 0.12 - 0.06; // small random drift
    const targetX = pocketIndex / (PINBALL_POCKET_MULTIPLIERS.length - 1);
    // Gradually guide toward target pocket with randomness
    const progress = (row + 1) / PEG_ROWS;
    x = x + (targetX - x) * (0.2 + progress * 0.15) + drift;
    x = Math.max(0.02, Math.min(0.98, x));
    const y = (row + 1) / PEG_ROWS;
    path.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }

  // Final position: center of the pocket
  const finalX = pocketIndex / (PINBALL_POCKET_MULTIPLIERS.length - 1);
  path.push({ x: Math.round(finalX * 1000) / 1000, y: 1 });

  return path;
}

export function spinPinball(userId: number, amountCents: number, betLevel: number): PinballSpinResult {
  const level = Math.max(1, Math.min(3, betLevel));
  const totalBet = amountCents * level;

  const serverSeed = generateSeed();
  const clientSeed = generateSeed();
  const nonce = Date.now();

  // Generate reel stops
  const reelStops: number[] = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    const hash = hmacResult(serverSeed, `${clientSeed}:reel${i}`, nonce);
    reelStops.push(hashToNumber(hash, PINBALL_REEL_LENGTH));
  }

  const allSymbols = reelStops.map((stop, i) => getVisibleSymbols(i, stop));
  // Center row = payline (index 1)
  const paylineSymbols = allSymbols.map(col => col[1]);

  // Check for 3-of-a-kind on payline
  let winMultiplier = 0;
  let winningSymbol: PinballSymbol | null = null;
  if (paylineSymbols[0] === paylineSymbols[1] && paylineSymbols[1] === paylineSymbols[2]) {
    if (paylineSymbols[0] !== 'pinball') {
      winMultiplier = PINBALL_PAYOUTS[paylineSymbols[0]];
      winningSymbol = paylineSymbols[0];
    }
  }
  // Partial: 2 cherries from left
  if (!winningSymbol && paylineSymbols[0] === 'cherry' && paylineSymbols[1] === 'cherry') {
    winMultiplier = 2;
    winningSymbol = 'cherry';
  }

  // Check for bonus: pinball on reel 3 center
  const bonusTriggered = paylineSymbols[2] === 'pinball';

  let basePayout = amountCents * winMultiplier;
  let bonusResult: PinballSpinResult['bonus'] = undefined;

  if (bonusTriggered) {
    const ballsCount = getBallsForLevel(level);
    const balls: PinballBonusBallResult[] = [];
    let totalBonusMult = 0;

    for (let b = 0; b < ballsCount; b++) {
      const hash = hmacResult(serverSeed, `${clientSeed}:bonus:ball${b}`, nonce);
      const hashNum = parseInt(hash.substring(0, 8), 16);
      const pocketIndex = selectPocket(hashNum);
      const multiplier = PINBALL_POCKET_MULTIPLIERS[pocketIndex];
      const path = generateBallPath(pocketIndex, serverSeed, b, nonce);
      totalBonusMult += multiplier;
      balls.push({ pocket_index: pocketIndex, multiplier, path });
    }

    const bonusPayout = amountCents * totalBonusMult;
    bonusResult = {
      balls_count: ballsCount,
      balls,
      total_bonus_multiplier: totalBonusMult,
      bonus_payout_cents: bonusPayout,
    };
    basePayout += bonusPayout;
  }

  const totalPayout = basePayout > 0 ? applyPrestigeBonus(userId, basePayout, totalBet) : 0;

  const run = db.transaction(() => {
    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?')
      .run(totalBet, userId);
    db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
      .run(userId, -totalBet, 'BET', 'pinball');

    if (totalPayout > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?')
        .run(totalPayout, userId);
      db.prepare('INSERT INTO transactions (user_id, amount_cents, type, game_type) VALUES (?, ?, ?, ?)')
        .run(userId, totalPayout, 'WIN', 'pinball');
    }

    db.prepare(
      'INSERT INTO game_logs (user_id, game_type, server_seed, client_seed, nonce, result_data) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, 'pinball', serverSeed, clientSeed, nonce, JSON.stringify({ reelStops, paylineSymbols, bonusTriggered }));

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  updateStats(userId, { wagered: totalBet, won: totalPayout, isWin: totalPayout > 0, gameType: 'pinball' });
  const newAchievements = checkAchievements(userId);

  return {
    reel_stops: reelStops,
    symbols: paylineSymbols,
    all_symbols: allSymbols,
    win_multiplier: winMultiplier,
    winning_symbol: winningSymbol,
    bonus_triggered: bonusTriggered,
    bonus: bonusResult,
    bet_level: level,
    payout_cents: totalPayout,
    new_balance_cents: newAchievements.length > 0
      ? (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents
      : newBalance,
    server_seed_hash: hashSeed(serverSeed),
    client_seed: clientSeed,
    nonce,
    new_achievements: newAchievements.length > 0 ? newAchievements : undefined,
  };
}
