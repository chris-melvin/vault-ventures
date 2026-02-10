import db from '../db/database.js';
import type { Achievement, AchievementUnlock, UserStats } from '../../../shared/types.ts';

// ============ Seed Achievements ============
const ACHIEVEMENT_SEEDS = [
  // Wealth
  { id: 'rich_1k', name: 'Getting Started', description: 'Reach $1,000 balance', icon: '💰', category: 'wealth', threshold: 100000, reward_cents: 1000 },
  { id: 'rich_10k', name: 'High Roller', description: 'Reach $10,000 balance', icon: '💎', category: 'wealth', threshold: 1000000, reward_cents: 5000 },
  { id: 'rich_100k', name: 'Whale', description: 'Reach $100,000 balance', icon: '🐋', category: 'wealth', threshold: 10000000, reward_cents: 25000 },
  { id: 'rich_1m', name: 'Millionaire', description: 'Reach $1,000,000 balance', icon: '👑', category: 'wealth', threshold: 100000000, reward_cents: 100000 },

  // Gambling - total wagered
  { id: 'wager_1k', name: 'Casual Bettor', description: 'Wager $1,000 total', icon: '🎲', category: 'gambling', threshold: 100000, reward_cents: 500 },
  { id: 'wager_10k', name: 'Regular', description: 'Wager $10,000 total', icon: '🎯', category: 'gambling', threshold: 1000000, reward_cents: 5000 },
  { id: 'wager_100k', name: 'VIP Gambler', description: 'Wager $100,000 total', icon: '🏆', category: 'gambling', threshold: 10000000, reward_cents: 25000 },
  { id: 'wager_1m', name: 'Legendary Gambler', description: 'Wager $1,000,000 total', icon: '⭐', category: 'gambling', threshold: 100000000, reward_cents: 100000 },

  // Gambling - games played
  { id: 'play_10', name: 'Newcomer', description: 'Play 10 games', icon: '🎮', category: 'gambling', threshold: 10, reward_cents: 500 },
  { id: 'play_100', name: 'Frequent Player', description: 'Play 100 games', icon: '🕹️', category: 'gambling', threshold: 100, reward_cents: 2500 },
  { id: 'play_500', name: 'Veteran', description: 'Play 500 games', icon: '🎖️', category: 'gambling', threshold: 500, reward_cents: 10000 },
  { id: 'play_1000', name: 'Grinder', description: 'Play 1,000 games', icon: '💪', category: 'gambling', threshold: 1000, reward_cents: 25000 },

  // Gambling - big wins
  { id: 'bigwin_1k', name: 'Nice Hit', description: 'Win $1,000 in a single game', icon: '🎉', category: 'gambling', threshold: 100000, reward_cents: 2000 },
  { id: 'bigwin_10k', name: 'Jackpot', description: 'Win $10,000 in a single game', icon: '🌟', category: 'gambling', threshold: 1000000, reward_cents: 10000 },
  { id: 'bigwin_50k', name: 'Mega Win', description: 'Win $50,000 in a single game', icon: '🔥', category: 'gambling', threshold: 5000000, reward_cents: 50000 },

  // Streaks
  { id: 'streak_3', name: 'Hot Hand', description: 'Win 3 games in a row', icon: '🔥', category: 'streak', threshold: 3, reward_cents: 1000 },
  { id: 'streak_5', name: 'On Fire', description: 'Win 5 games in a row', icon: '🌋', category: 'streak', threshold: 5, reward_cents: 5000 },
  { id: 'streak_10', name: 'Unstoppable', description: 'Win 10 games in a row', icon: '⚡', category: 'streak', threshold: 10, reward_cents: 25000 },
  { id: 'streak_loss_5', name: 'Tough Luck', description: 'Lose 5 games in a row', icon: '😤', category: 'streak', threshold: 5, reward_cents: 2500 },
  { id: 'streak_loss_10', name: 'Resilient', description: 'Lose 10 games in a row and keep going', icon: '🛡️', category: 'streak', threshold: 10, reward_cents: 10000 },

  // Bank
  { id: 'bank_first', name: 'Saver', description: 'Make your first bank deposit', icon: '🏦', category: 'bank', threshold: 1, reward_cents: 500 },
  { id: 'bank_100k', name: 'Trust Fund', description: 'Have $100,000 in the bank', icon: '🏛️', category: 'bank', threshold: 10000000, reward_cents: 25000 },
  { id: 'interest_1k', name: 'Money Grows', description: 'Earn $1,000 total interest', icon: '📈', category: 'bank', threshold: 100000, reward_cents: 5000 },
  { id: 'interest_10k', name: 'Interest Mogul', description: 'Earn $10,000 total interest', icon: '💹', category: 'bank', threshold: 1000000, reward_cents: 25000 },

  // Collection
  { id: 'collect_first', name: 'Collector', description: 'Buy your first market item', icon: '🛍️', category: 'collection', threshold: 1, reward_cents: 500 },
  { id: 'collect_5', name: 'Curator', description: 'Own 5 different market items', icon: '🗃️', category: 'collection', threshold: 5, reward_cents: 5000 },
  { id: 'collect_profit', name: 'Smart Investor', description: 'Sell an item for profit', icon: '📊', category: 'collection', threshold: 1, reward_cents: 2500 },
];

export function seedAchievements(): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO achievements (id, name, description, icon, category, threshold, reward_cents) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    for (const a of ACHIEVEMENT_SEEDS) {
      insert.run(a.id, a.name, a.description, a.icon, a.category, a.threshold, a.reward_cents);
    }
  });

  run();
}

// ============ Stats Tracking ============
interface StatsUpdate {
  wagered: number;
  won: number;
  isWin: boolean;
  gameType: string;
}

export function updateStats(userId: number, update: StatsUpdate): void {
  const existing = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as any;
  const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };

  if (!existing) {
    const gamesPerType: Record<string, number> = { [update.gameType]: 1 };
    db.prepare(
      `INSERT INTO user_stats (user_id, total_wagered_cents, total_won_cents, biggest_win_cents,
        total_games_played, current_win_streak, best_win_streak, current_loss_streak, worst_loss_streak,
        games_per_type, peak_balance_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId, update.wagered, update.won, update.won,
      1,
      update.isWin ? 1 : 0, update.isWin ? 1 : 0,
      update.isWin ? 0 : 1, update.isWin ? 0 : 1,
      JSON.stringify(gamesPerType),
      Math.max(wallet.balance_cents, 0)
    );
    return;
  }

  const gamesPerType: Record<string, number> = JSON.parse(existing.games_per_type || '{}');
  gamesPerType[update.gameType] = (gamesPerType[update.gameType] || 0) + 1;

  const newWinStreak = update.isWin ? existing.current_win_streak + 1 : 0;
  const newLossStreak = update.isWin ? 0 : existing.current_loss_streak + 1;
  const bestWinStreak = Math.max(existing.best_win_streak, newWinStreak);
  const worstLossStreak = Math.max(existing.worst_loss_streak, newLossStreak);
  const biggestWin = Math.max(existing.biggest_win_cents, update.won);
  const peakBalance = Math.max(existing.peak_balance_cents, wallet.balance_cents);

  db.prepare(
    `UPDATE user_stats SET
      total_wagered_cents = total_wagered_cents + ?,
      total_won_cents = total_won_cents + ?,
      biggest_win_cents = ?,
      total_games_played = total_games_played + 1,
      current_win_streak = ?,
      best_win_streak = ?,
      current_loss_streak = ?,
      worst_loss_streak = ?,
      games_per_type = ?,
      peak_balance_cents = ?
    WHERE user_id = ?`
  ).run(
    update.wagered, update.won, biggestWin,
    newWinStreak, bestWinStreak,
    newLossStreak, worstLossStreak,
    JSON.stringify(gamesPerType),
    peakBalance,
    userId
  );
}

// ============ Achievement Checking ============
export function checkAchievements(userId: number): AchievementUnlock[] {
  const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as any;
  if (!stats) return [];

  const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
  const bankAccount = db.prepare('SELECT balance_cents, total_interest_earned_cents FROM bank_accounts WHERE user_id = ?').get(userId) as any;
  const inventoryCount = (db.prepare('SELECT COUNT(DISTINCT item_id) as cnt FROM user_inventory WHERE user_id = ?').get(userId) as any)?.cnt || 0;

  const allAchievements = db.prepare('SELECT * FROM achievements').all() as any[];
  const unlocked = new Set(
    (db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId) as any[]).map(r => r.achievement_id)
  );

  const newUnlocks: AchievementUnlock[] = [];

  for (const a of allAchievements) {
    if (unlocked.has(a.id)) continue;

    let met = false;
    switch (a.id) {
      // Wealth
      case 'rich_1k': case 'rich_10k': case 'rich_100k': case 'rich_1m':
        met = stats.peak_balance_cents >= a.threshold || wallet.balance_cents >= a.threshold;
        break;

      // Wagered
      case 'wager_1k': case 'wager_10k': case 'wager_100k': case 'wager_1m':
        met = stats.total_wagered_cents >= a.threshold;
        break;

      // Games played
      case 'play_10': case 'play_100': case 'play_500': case 'play_1000':
        met = stats.total_games_played >= a.threshold;
        break;

      // Big wins
      case 'bigwin_1k': case 'bigwin_10k': case 'bigwin_50k':
        met = stats.biggest_win_cents >= a.threshold;
        break;

      // Win streaks
      case 'streak_3': case 'streak_5': case 'streak_10':
        met = stats.best_win_streak >= a.threshold;
        break;

      // Loss streaks
      case 'streak_loss_5': case 'streak_loss_10':
        met = stats.worst_loss_streak >= a.threshold;
        break;

      // Bank
      case 'bank_first':
        met = bankAccount && bankAccount.balance_cents > 0;
        break;
      case 'bank_100k':
        met = bankAccount && bankAccount.balance_cents >= a.threshold;
        break;
      case 'interest_1k': case 'interest_10k':
        met = bankAccount && bankAccount.total_interest_earned_cents >= a.threshold;
        break;

      // Collection
      case 'collect_first':
        met = inventoryCount >= 1;
        break;
      case 'collect_5':
        met = inventoryCount >= 5;
        break;
      case 'collect_profit': {
        // Check if user ever sold for profit
        const profitSale = db.prepare(
          `SELECT mt.id FROM market_transactions mt
           JOIN user_inventory ui ON mt.item_id = ui.item_id AND mt.user_id = ui.user_id
           WHERE mt.user_id = ? AND mt.action = 'SELL' AND mt.price_cents > ui.purchased_price_cents
           LIMIT 1`
        ).get(userId);
        met = !!profitSale;
        break;
      }
    }

    if (met) {
      db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, a.id);

      if (a.reward_cents > 0) {
        db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(a.reward_cents, userId);
        db.prepare(
          'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
        ).run(userId, a.reward_cents, 'ACHIEVEMENT_REWARD', `Achievement: ${a.name}`);
      }

      newUnlocks.push({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        reward_cents: a.reward_cents,
      });
    }
  }

  return newUnlocks;
}

export function getUserAchievements(userId: number): { achievements: Achievement[]; stats: UserStats } {
  const allAchievements = db.prepare('SELECT * FROM achievements').all() as any[];
  const userUnlocks = db.prepare('SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?').all(userId) as any[];
  const unlockMap = new Map(userUnlocks.map(u => [u.achievement_id, u.unlocked_at]));

  const achievements: Achievement[] = allAchievements.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    threshold: a.threshold,
    reward_cents: a.reward_cents,
    unlocked: unlockMap.has(a.id),
    unlocked_at: unlockMap.get(a.id),
  }));

  const statsRow = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) as any;
  const stats: UserStats = statsRow ? {
    total_wagered_cents: statsRow.total_wagered_cents,
    total_won_cents: statsRow.total_won_cents,
    biggest_win_cents: statsRow.biggest_win_cents,
    total_games_played: statsRow.total_games_played,
    current_win_streak: statsRow.current_win_streak,
    best_win_streak: statsRow.best_win_streak,
    current_loss_streak: statsRow.current_loss_streak,
    worst_loss_streak: statsRow.worst_loss_streak,
    games_per_type: JSON.parse(statsRow.games_per_type || '{}'),
    peak_balance_cents: statsRow.peak_balance_cents,
  } : {
    total_wagered_cents: 0,
    total_won_cents: 0,
    biggest_win_cents: 0,
    total_games_played: 0,
    current_win_streak: 0,
    best_win_streak: 0,
    current_loss_streak: 0,
    worst_loss_streak: 0,
    games_per_type: {},
    peak_balance_cents: 0,
  };

  return { achievements, stats };
}

export function getUserStats(userId: number): UserStats {
  return getUserAchievements(userId).stats;
}
