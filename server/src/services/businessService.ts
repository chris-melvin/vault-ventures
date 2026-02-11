import db from '../db/database.js';
import { getMultiplier } from './prestigeService.js';
import type {
  BusinessType, OwnedBusiness, BusinessEmpireState,
  BusinessBuyResult, BusinessUpgradeResult, BusinessCollectResult,
} from '../../../shared/types.ts';

const BUSINESS_SEEDS = [
  { id: 'food_cart', name: 'Food Cart', description: 'Street food cart near a school', icon: '🍢', base_cost_cents: 50000, base_income_cents_per_hour: 250, max_level: 5, upgrade_cost_multiplier: 2.0 },
  { id: 'sari_sari_store', name: 'Sari-Sari Store', description: 'Neighborhood convenience store in the barangay', icon: '🧃', base_cost_cents: 200000, base_income_cents_per_hour: 800, max_level: 5, upgrade_cost_multiplier: 2.0 },
  { id: 'videoke_bar', name: 'Videoke Bar', description: 'KTV bar with 8 private rooms', icon: '🎤', base_cost_cents: 1000000, base_income_cents_per_hour: 3500, max_level: 5, upgrade_cost_multiplier: 2.0 },
  { id: 'restaurant', name: 'Restaurant', description: 'Upscale Filipino fusion restaurant', icon: '🍽️', base_cost_cents: 5000000, base_income_cents_per_hour: 15000, max_level: 5, upgrade_cost_multiplier: 2.0 },
  { id: 'boutique_hotel', name: 'Boutique Hotel', description: 'Trendy 30-room hotel in BGC', icon: '🏨', base_cost_cents: 25000000, base_income_cents_per_hour: 60000, max_level: 5, upgrade_cost_multiplier: 2.0 },
  { id: 'casino_business', name: 'Casino', description: 'Full-service casino and entertainment complex', icon: '🎰', base_cost_cents: 100000000, base_income_cents_per_hour: 200000, max_level: 5, upgrade_cost_multiplier: 2.0 },
];

export function initBusinessTables(): void {
  // Tables and migrations are handled in schema.sql and database.ts
  // Seed business types
  const insert = db.prepare(
    'INSERT OR IGNORE INTO business_types (id, name, description, icon, base_cost_cents, base_income_cents_per_hour, max_level, upgrade_cost_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const b of BUSINESS_SEEDS) {
    insert.run(b.id, b.name, b.description, b.icon, b.base_cost_cents, b.base_income_cents_per_hour, b.max_level, b.upgrade_cost_multiplier);
  }
}

function computeIncome(baseIncome: number, level: number, prestigeMultiplier: number): number {
  return Math.floor(baseIncome * (1 + (level - 1) * 0.5) * prestigeMultiplier);
}

function computeUpgradeCost(baseCost: number, multiplier: number, currentLevel: number): number {
  return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

export function getBusinessEmpire(userId: number): BusinessEmpireState {
  const prestigeMultiplier = getMultiplier(userId);
  const now = Math.floor(Date.now() / 1000);

  const types = db.prepare('SELECT * FROM business_types ORDER BY base_cost_cents ASC').all() as any[];
  const available: BusinessType[] = types.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    base_cost_cents: t.base_cost_cents,
    base_income_cents_per_hour: t.base_income_cents_per_hour,
    max_level: t.max_level,
    upgrade_cost_multiplier: t.upgrade_cost_multiplier,
  }));

  const owned = db.prepare(
    `SELECT ub.id, ub.business_type_id, ub.level, ub.last_collected_at,
            bt.name, bt.description, bt.icon, bt.base_cost_cents, bt.base_income_cents_per_hour, bt.max_level, bt.upgrade_cost_multiplier
     FROM user_businesses ub
     JOIN business_types bt ON ub.business_type_id = bt.id
     WHERE ub.user_id = ?
     ORDER BY bt.base_cost_cents ASC`
  ).all(userId) as any[];

  let totalIncomePerHour = 0;
  let totalPending = 0;

  const ownedBusinesses: OwnedBusiness[] = owned.map(row => {
    const incomePerHour = computeIncome(row.base_income_cents_per_hour, row.level, prestigeMultiplier);
    const hoursElapsed = (now - row.last_collected_at) / 3600;
    const pending = Math.floor(incomePerHour * hoursElapsed);
    const nextCost = row.level < row.max_level
      ? computeUpgradeCost(row.base_cost_cents, row.upgrade_cost_multiplier, row.level)
      : null;

    totalIncomePerHour += incomePerHour;
    totalPending += pending;

    return {
      id: row.id,
      business_type_id: row.business_type_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      level: row.level,
      max_level: row.max_level,
      income_cents_per_hour: incomePerHour,
      next_upgrade_cost_cents: nextCost,
      last_collected_at: row.last_collected_at,
      pending_income_cents: pending,
    };
  });

  return {
    available_businesses: available,
    owned_businesses: ownedBusinesses,
    total_income_per_hour_cents: totalIncomePerHour,
    total_pending_income_cents: totalPending,
  };
}

export function buyBusiness(userId: number, businessTypeId: string): BusinessBuyResult {
  const type = db.prepare('SELECT * FROM business_types WHERE id = ?').get(businessTypeId) as any;
  if (!type) throw new Error('Business type not found');

  const existing = db.prepare('SELECT id FROM user_businesses WHERE user_id = ? AND business_type_id = ?').get(userId, businessTypeId);
  if (existing) throw new Error('You already own this business');

  const run = db.transaction(() => {
    const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    if (wallet.balance_cents < type.base_cost_cents) throw new Error('Insufficient balance');

    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(type.base_cost_cents, userId);

    const result = db.prepare(
      'INSERT INTO user_businesses (user_id, business_type_id) VALUES (?, ?)'
    ).run(userId, businessTypeId);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, -type.base_cost_cents, 'BUSINESS_PURCHASE', `Bought ${type.name}`);

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
    const prestigeMultiplier = getMultiplier(userId);
    const incomePerHour = computeIncome(type.base_income_cents_per_hour, 1, prestigeMultiplier);

    const business: OwnedBusiness = {
      id: result.lastInsertRowid as number,
      business_type_id: businessTypeId,
      name: type.name,
      description: type.description,
      icon: type.icon,
      level: 1,
      max_level: type.max_level,
      income_cents_per_hour: incomePerHour,
      next_upgrade_cost_cents: computeUpgradeCost(type.base_cost_cents, type.upgrade_cost_multiplier, 1),
      last_collected_at: Math.floor(Date.now() / 1000),
      pending_income_cents: 0,
    };

    return { business, new_balance_cents: newBalance };
  });

  return run();
}

export function upgradeBusiness(userId: number, businessId: number): BusinessUpgradeResult {
  const run = db.transaction(() => {
    const row = db.prepare(
      `SELECT ub.*, bt.name, bt.description, bt.icon, bt.base_cost_cents, bt.base_income_cents_per_hour, bt.max_level, bt.upgrade_cost_multiplier
       FROM user_businesses ub JOIN business_types bt ON ub.business_type_id = bt.id
       WHERE ub.id = ? AND ub.user_id = ?`
    ).get(businessId, userId) as any;
    if (!row) throw new Error('Business not found');
    if (row.level >= row.max_level) throw new Error('Already at max level');

    const upgradeCost = computeUpgradeCost(row.base_cost_cents, row.upgrade_cost_multiplier, row.level);
    const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    if (wallet.balance_cents < upgradeCost) throw new Error('Insufficient balance');

    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(upgradeCost, userId);
    db.prepare('UPDATE user_businesses SET level = level + 1 WHERE id = ?').run(businessId);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, -upgradeCost, 'BUSINESS_PURCHASE', `Upgraded ${row.name} to level ${row.level + 1}`);

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
    const newLevel = row.level + 1;
    const prestigeMultiplier = getMultiplier(userId);
    const incomePerHour = computeIncome(row.base_income_cents_per_hour, newLevel, prestigeMultiplier);
    const nextCost = newLevel < row.max_level
      ? computeUpgradeCost(row.base_cost_cents, row.upgrade_cost_multiplier, newLevel)
      : null;

    const business: OwnedBusiness = {
      id: businessId,
      business_type_id: row.business_type_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      level: newLevel,
      max_level: row.max_level,
      income_cents_per_hour: incomePerHour,
      next_upgrade_cost_cents: nextCost,
      last_collected_at: row.last_collected_at,
      pending_income_cents: 0,
    };

    return { business, new_balance_cents: newBalance };
  });

  return run();
}

export function collectIncome(userId: number): BusinessCollectResult {
  const now = Math.floor(Date.now() / 1000);
  const prestigeMultiplier = getMultiplier(userId);

  const run = db.transaction(() => {
    const rows = db.prepare(
      `SELECT ub.id, ub.level, ub.last_collected_at, bt.base_income_cents_per_hour
       FROM user_businesses ub JOIN business_types bt ON ub.business_type_id = bt.id
       WHERE ub.user_id = ?`
    ).all(userId) as any[];

    let totalCollected = 0;
    let businessesCollected = 0;

    for (const row of rows) {
      const hoursElapsed = (now - row.last_collected_at) / 3600;
      if (hoursElapsed <= 0) continue;

      const incomePerHour = computeIncome(row.base_income_cents_per_hour, row.level, prestigeMultiplier);
      const income = Math.floor(incomePerHour * hoursElapsed);
      if (income <= 0) continue;

      totalCollected += income;
      businessesCollected++;
      db.prepare('UPDATE user_businesses SET last_collected_at = ? WHERE id = ?').run(now, row.id);
    }

    if (totalCollected > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(totalCollected, userId);
      db.prepare(
        'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
      ).run(userId, totalCollected, 'BUSINESS_INCOME', `Collected from ${businessesCollected} businesses`);
    }

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
    return { total_collected_cents: totalCollected, businesses_collected: businessesCollected, new_balance_cents: newBalance };
  });

  return run();
}

export function getBusinessValue(userId: number): number {
  const rows = db.prepare(
    `SELECT bt.base_cost_cents, ub.level, bt.upgrade_cost_multiplier
     FROM user_businesses ub JOIN business_types bt ON ub.business_type_id = bt.id
     WHERE ub.user_id = ?`
  ).all(userId) as any[];

  let total = 0;
  for (const row of rows) {
    // Value = purchase cost + all upgrade costs paid
    let value = row.base_cost_cents;
    for (let l = 1; l < row.level; l++) {
      value += Math.floor(row.base_cost_cents * Math.pow(row.upgrade_cost_multiplier, l));
    }
    total += value;
  }
  return total;
}
