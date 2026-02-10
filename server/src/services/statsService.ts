import db from '../db/database.js';
import { getUserInventory } from './marketService.js';
import type {
  BalanceHistoryPoint, GameTypeStats, ProfitLossPoint, StatsDeepDiveResponse,
} from '../../../shared/types.ts';

const STARTING_BALANCE = 100000; // $1,000

export function getStatsDeepDive(userId: number): StatsDeepDiveResponse {
  return {
    balance_history: getBalanceHistory(userId),
    game_type_stats: getGameTypeStats(userId),
    market_roi: getMarketROI(userId),
    profit_loss_timeline: getProfitLossTimeline(userId),
  };
}

function getBalanceHistory(userId: number): BalanceHistoryPoint[] {
  // Walk all transactions + meta_transactions chronologically
  const transactions = db.prepare(
    `SELECT amount_cents, timestamp FROM transactions WHERE user_id = ? ORDER BY timestamp ASC`
  ).all(userId) as { amount_cents: number; timestamp: number }[];

  const metaTransactions = db.prepare(
    `SELECT amount_cents, timestamp FROM meta_transactions WHERE user_id = ? ORDER BY timestamp ASC`
  ).all(userId) as { amount_cents: number; timestamp: number }[];

  // Merge and sort
  const all = [
    ...transactions.map((t) => ({ amount: t.amount_cents, ts: t.timestamp })),
    ...metaTransactions.map((t) => ({ amount: t.amount_cents, ts: t.timestamp })),
  ].sort((a, b) => a.ts - b.ts);

  if (all.length === 0) {
    return [{ timestamp: Math.floor(Date.now() / 1000), balance_cents: STARTING_BALANCE }];
  }

  // Bucket by hour
  const points: BalanceHistoryPoint[] = [];
  let balance = STARTING_BALANCE;
  let currentBucket = 0;

  for (const entry of all) {
    const bucket = Math.floor(entry.ts / 3600) * 3600;
    if (bucket !== currentBucket && currentBucket !== 0) {
      points.push({ timestamp: currentBucket, balance_cents: balance });
    }
    balance += entry.amount;
    currentBucket = bucket;
  }
  // Push final bucket
  if (currentBucket !== 0) {
    points.push({ timestamp: currentBucket, balance_cents: balance });
  }

  // Limit to last 168 points (7 days hourly)
  return points.slice(-168);
}

function getGameTypeStats(userId: number): GameTypeStats[] {
  // Aggregate from transactions table
  const betRows = db.prepare(
    `SELECT game_type, SUM(ABS(amount_cents)) as total_wagered
     FROM transactions
     WHERE user_id = ? AND type = 'BET' AND game_type IS NOT NULL
     GROUP BY game_type`
  ).all(userId) as { game_type: string; total_wagered: number }[];

  const winRows = db.prepare(
    `SELECT game_type, SUM(amount_cents) as total_won
     FROM transactions
     WHERE user_id = ? AND type = 'WIN' AND game_type IS NOT NULL
     GROUP BY game_type`
  ).all(userId) as { game_type: string; total_won: number }[];

  const winMap = new Map(winRows.map((r) => [r.game_type, r.total_won]));

  // Get games played from user_stats
  const statsRow = db.prepare('SELECT games_per_type FROM user_stats WHERE user_id = ?').get(userId) as
    { games_per_type: string } | undefined;
  const gamesPerType: Record<string, number> = statsRow ? JSON.parse(statsRow.games_per_type || '{}') : {};

  // Get win counts from game_logs
  const winCounts = db.prepare(
    `SELECT game_type, COUNT(*) as wins
     FROM game_logs gl
     WHERE gl.user_id = ?
     AND EXISTS (
       SELECT 1 FROM transactions t
       WHERE t.user_id = gl.user_id
       AND t.type = 'WIN'
       AND t.game_type = gl.game_type
       AND t.timestamp = gl.timestamp
     )
     GROUP BY game_type`
  ).all(userId) as { game_type: string; wins: number }[];
  const winCountMap = new Map(winCounts.map((r) => [r.game_type, r.wins]));

  return betRows.map((row) => {
    const totalWon = winMap.get(row.game_type) || 0;
    const gamesPlayed = gamesPerType[row.game_type] || 0;
    const wins = winCountMap.get(row.game_type) || 0;

    return {
      game_type: row.game_type,
      games_played: gamesPlayed,
      total_wagered_cents: row.total_wagered,
      total_won_cents: totalWon,
      net_profit_cents: totalWon - row.total_wagered,
      win_rate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    };
  });
}

function getMarketROI(userId: number): StatsDeepDiveResponse['market_roi'] {
  // Total invested (BUY transactions)
  const buyRow = db.prepare(
    `SELECT COALESCE(SUM(price_cents * quantity), 0) as total
     FROM market_transactions WHERE user_id = ? AND action = 'BUY'`
  ).get(userId) as { total: number };

  // Total sold (SELL transactions)
  const sellRow = db.prepare(
    `SELECT COALESCE(SUM(price_cents * quantity), 0) as total
     FROM market_transactions WHERE user_id = ? AND action = 'SELL'`
  ).get(userId) as { total: number };

  // Current holdings value
  const inventory = getUserInventory(userId);
  const holdingsValue = inventory.reduce((sum, item) => sum + item.current_price_cents * item.quantity, 0);
  const costBasis = inventory.reduce((sum, item) => sum + item.purchased_price_cents * item.quantity, 0);

  // Rent earned from meta_transactions
  const rentRow = db.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) as total
     FROM meta_transactions WHERE user_id = ? AND type = 'RENT'`
  ).get(userId) as { total: number };

  return {
    total_invested_cents: buyRow.total,
    total_sold_cents: sellRow.total,
    current_holdings_value_cents: holdingsValue,
    realized_pl_cents: sellRow.total - buyRow.total + rentRow.total,
    unrealized_pl_cents: holdingsValue - costBasis,
    rent_earned_cents: rentRow.total,
  };
}

function getProfitLossTimeline(userId: number): ProfitLossPoint[] {
  const transactions = db.prepare(
    `SELECT amount_cents, type, timestamp FROM transactions
     WHERE user_id = ? AND game_type IS NOT NULL
     ORDER BY timestamp ASC`
  ).all(userId) as { amount_cents: number; type: string; timestamp: number }[];

  if (transactions.length === 0) return [];

  const points: ProfitLossPoint[] = [];
  let cumProfit = 0;
  let currentBucket = 0;

  for (const tx of transactions) {
    const bucket = Math.floor(tx.timestamp / 3600) * 3600;
    if (bucket !== currentBucket && currentBucket !== 0) {
      points.push({ timestamp: currentBucket, cumulative_profit_cents: cumProfit });
    }
    cumProfit += tx.amount_cents; // BET is negative, WIN is positive
    currentBucket = bucket;
  }
  if (currentBucket !== 0) {
    points.push({ timestamp: currentBucket, cumulative_profit_cents: cumProfit });
  }

  return points.slice(-168);
}
