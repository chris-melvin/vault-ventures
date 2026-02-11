import db from '../db/database.js';
import { PRESTIGE_LEVELS, type PrestigeStatus, type PrestigeExecuteResult } from '../../../shared/types.ts';
import { getNetWorth } from './netWorthService.js';

// Tables are handled in schema.sql and database.ts
export function initPrestigeTables(): void {
  // No-op: tables created by schema.sql
}

function getOrCreatePrestige(userId: number): { level: number; multiplier: number; total_prestiges: number } {
  let row = db.prepare('SELECT level, multiplier, total_prestiges FROM user_prestige WHERE user_id = ?').get(userId) as
    { level: number; multiplier: number; total_prestiges: number } | undefined;
  if (!row) {
    db.prepare('INSERT INTO user_prestige (user_id) VALUES (?)').run(userId);
    row = { level: 0, multiplier: 1.0, total_prestiges: 0 };
  }
  return row;
}

export function getMultiplier(userId: number): number {
  const row = db.prepare('SELECT multiplier FROM user_prestige WHERE user_id = ?').get(userId) as
    { multiplier: number } | undefined;
  return row?.multiplier ?? 1.0;
}

export function getPrestigeLevel(userId: number): number {
  const row = db.prepare('SELECT level FROM user_prestige WHERE user_id = ?').get(userId) as
    { level: number } | undefined;
  return row?.level ?? 0;
}

/**
 * Apply prestige bonus to a payout. Only boosts the profit portion.
 * payout = bet + profit => boosted = bet + (profit * multiplier)
 */
export function applyPrestigeBonus(userId: number, payoutCents: number, betCents: number): number {
  const multiplier = getMultiplier(userId);
  if (multiplier <= 1.0 || payoutCents <= betCents) return payoutCents;
  const profit = payoutCents - betCents;
  return betCents + Math.floor(profit * multiplier);
}

export function getPrestigeStatus(userId: number): PrestigeStatus {
  const prestige = getOrCreatePrestige(userId);
  const netWorth = getNetWorth(userId);

  const nextLevel = PRESTIGE_LEVELS.find(l => l.level === prestige.level + 1) ?? null;
  const canPrestige = nextLevel !== null && netWorth.total_net_worth_cents >= nextLevel.net_worth_required_cents;

  return {
    current_level: prestige.level,
    current_multiplier: prestige.multiplier,
    next_level: nextLevel,
    can_prestige: canPrestige,
    total_prestiges: prestige.total_prestiges,
    current_net_worth_cents: netWorth.total_net_worth_cents,
  };
}

export function executePrestige(userId: number): PrestigeExecuteResult {
  const status = getPrestigeStatus(userId);
  if (!status.can_prestige || !status.next_level) {
    throw new Error('Cannot prestige: requirements not met');
  }

  const newLevel = status.next_level.level;
  const newMultiplier = status.next_level.multiplier;
  const startingBalance = 100000; // $1,000

  const run = db.transaction(() => {
    // Log prestige event
    db.prepare(
      'INSERT INTO prestige_history (user_id, from_level, to_level, net_worth_at_prestige) VALUES (?, ?, ?, ?)'
    ).run(userId, status.current_level, newLevel, status.current_net_worth_cents);

    // Reset wallet balance to $1,000
    db.prepare('UPDATE users SET balance_cents = ? WHERE id = ?').run(startingBalance, userId);

    // Reset bank balance to $0
    db.prepare('UPDATE bank_accounts SET balance_cents = 0 WHERE user_id = ?').run(userId);

    // Delete all market holdings (stocks, property, collectibles, vehicles, crypto)
    db.prepare('DELETE FROM user_inventory WHERE user_id = ?').run(userId);

    // Delete all businesses
    db.prepare('DELETE FROM user_businesses WHERE user_id = ?').run(userId);

    // Update prestige level
    db.prepare(
      'UPDATE user_prestige SET level = ?, multiplier = ?, total_prestiges = total_prestiges + 1 WHERE user_id = ?'
    ).run(newLevel, newMultiplier, userId);
  });

  run();

  return {
    new_level: newLevel,
    new_multiplier: newMultiplier,
    new_balance_cents: startingBalance,
  };
}
