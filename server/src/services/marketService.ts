import { createHash } from 'crypto';
import db from '../db/database.js';
import type {
  MarketItemWithPrice, MarketItemDetail, PricePoint,
  MarketBuyResult, MarketSellResult, InventoryItem, MarketTransaction,
} from '../../../shared/types.ts';

// ============ Deterministic Pricing ============
const PRICE_PERIOD_SECONDS = 1800; // 30 minutes

function hashPrice(seed: number, timeBucket: number): number {
  const hash = createHash('sha256').update(`${seed}:${timeBucket}`).digest('hex');
  // Use first 8 hex chars for a 0-1 float
  const value = parseInt(hash.substring(0, 8), 16);
  return value / 0xffffffff;
}

function getCurrentPrice(basePriceCents: number, volatility: number, seed: number, timestamp?: number): number {
  const now = timestamp ?? Math.floor(Date.now() / 1000);
  const timeBucket = Math.floor(now / PRICE_PERIOD_SECONDS);
  const hashVal = hashPrice(seed, timeBucket);
  // Convert to a wave between -1 and 1
  const wave = (hashVal * 2) - 1;
  const price = Math.floor(basePriceCents * (1 + wave * volatility));
  // Floor at 10% of base
  return Math.max(Math.floor(basePriceCents * 0.1), price);
}

function getPreviousPrice(basePriceCents: number, volatility: number, seed: number): number {
  const now = Math.floor(Date.now() / 1000);
  const prevTimestamp = now - PRICE_PERIOD_SECONDS;
  return getCurrentPrice(basePriceCents, volatility, seed, prevTimestamp);
}

// ============ Seed Market Items ============
const MARKET_ITEM_SEEDS = [
  // Collectibles
  { id: 'lucky_gold_chip', name: 'Lucky Gold Chip', description: 'A rare gold casino chip from the old days', icon: '🪙', category: 'collectible', base_price_cents: 50000, volatility: 0.25, rarity: 'uncommon', seed: 1001 },
  { id: 'vintage_cards', name: 'Vintage Playing Cards', description: 'A pristine deck from 1960s Manila', icon: '🃏', category: 'collectible', base_price_cents: 30000, volatility: 0.2, rarity: 'common', seed: 1002 },
  { id: 'crystal_dice', name: 'Crystal Dice Set', description: 'Hand-carved crystal dice with gold pips', icon: '🎲', category: 'collectible', base_price_cents: 150000, volatility: 0.3, rarity: 'rare', seed: 1003 },
  { id: 'manila_painting', name: 'Manila Bay Painting', description: 'Original oil painting of Manila Bay sunset', icon: '🖼️', category: 'collectible', base_price_cents: 500000, volatility: 0.35, rarity: 'epic', seed: 1004 },
  { id: 'pearl_necklace', name: 'South Sea Pearl Necklace', description: 'Lustrous pearls from Palawan', icon: '📿', category: 'collectible', base_price_cents: 800000, volatility: 0.4, rarity: 'epic', seed: 1005 },
  { id: 'golden_tarsier', name: 'Golden Tarsier Figurine', description: 'Solid gold tarsier statuette', icon: '🐒', category: 'collectible', base_price_cents: 2000000, volatility: 0.3, rarity: 'legendary', seed: 1006 },
  { id: 'ruby_ring', name: 'Pigeon Blood Ruby Ring', description: 'Extremely rare Burmese ruby', icon: '💍', category: 'collectible', base_price_cents: 5000000, volatility: 0.35, rarity: 'legendary', seed: 1007 },

  // Stocks
  { id: 'jollibee_stock', name: 'Jollibee Corp', description: 'JFC - The beloved fast food giant', icon: '🐝', category: 'stock', base_price_cents: 25000, volatility: 0.35, rarity: 'common', seed: 2001 },
  { id: 'sm_stock', name: 'SM Holdings', description: 'SMPH - Mall empire conglomerate', icon: '🏬', category: 'stock', base_price_cents: 40000, volatility: 0.4, rarity: 'common', seed: 2002 },
  { id: 'casino_inc', name: 'Manila Casino Inc', description: 'MCR - Casino operator stock', icon: '🎰', category: 'stock', base_price_cents: 75000, volatility: 0.5, rarity: 'uncommon', seed: 2003 },
  { id: 'pacific_air', name: 'Pacific Airlines', description: 'PAL - Flag carrier airline', icon: '✈️', category: 'stock', base_price_cents: 15000, volatility: 0.55, rarity: 'common', seed: 2004 },
  { id: 'ayala_land', name: 'Ayala Land', description: 'ALI - Premier property developer', icon: '🏗️', category: 'stock', base_price_cents: 35000, volatility: 0.3, rarity: 'common', seed: 2005 },
  { id: 'globe_tel', name: 'Globe Telecom', description: 'GLO - Major telco provider', icon: '📱', category: 'stock', base_price_cents: 30000, volatility: 0.45, rarity: 'common', seed: 2006 },
  { id: 'bdo_bank', name: 'BDO Unibank', description: 'BDO - Largest bank by assets', icon: '🏦', category: 'stock', base_price_cents: 20000, volatility: 0.35, rarity: 'common', seed: 2007 },
  { id: 'crypto_peso', name: 'CryptoPeso Token', description: 'CPT - Volatile crypto token', icon: '₿', category: 'stock', base_price_cents: 10000, volatility: 0.6, rarity: 'uncommon', seed: 2008 },

  // Property
  { id: 'makati_condo', name: 'Condo in Makati', description: 'Studio unit in the business district', icon: '🏢', category: 'property', base_price_cents: 5000000, volatility: 0.08, rarity: 'rare', seed: 3001 },
  { id: 'boracay_house', name: 'Beach House in Boracay', description: 'Beachfront villa on White Beach', icon: '🏖️', category: 'property', base_price_cents: 15000000, volatility: 0.1, rarity: 'epic', seed: 3002 },
  { id: 'bgc_penthouse', name: 'Penthouse in BGC', description: 'Luxury penthouse with skyline view', icon: '🌆', category: 'property', base_price_cents: 50000000, volatility: 0.05, rarity: 'legendary', seed: 3003 },
  { id: 'tagaytay_lot', name: 'Tagaytay Hilltop Lot', description: 'Prime lot with Taal volcano view', icon: '⛰️', category: 'property', base_price_cents: 8000000, volatility: 0.12, rarity: 'rare', seed: 3004 },
  { id: 'palawan_resort', name: 'Palawan Island Resort', description: 'Private island resort in El Nido', icon: '🏝️', category: 'property', base_price_cents: 100000000, volatility: 0.07, rarity: 'legendary', seed: 3005 },

  // Vehicles
  { id: 'jeepney', name: 'Classic Jeepney', description: 'Restored vintage Philippine jeepney', icon: '🚌', category: 'vehicle', base_price_cents: 500000, volatility: 0.15, rarity: 'uncommon', seed: 4001 },
  { id: 'fortuner', name: 'Toyota Fortuner', description: 'Popular mid-size SUV', icon: '🚙', category: 'vehicle', base_price_cents: 2000000, volatility: 0.12, rarity: 'rare', seed: 4002 },
  { id: 'lambo', name: 'Lamborghini Huracan', description: 'Italian supercar with V10 engine', icon: '🏎️', category: 'vehicle', base_price_cents: 25000000, volatility: 0.2, rarity: 'epic', seed: 4003 },
  { id: 'yacht', name: 'Luxury Yacht', description: '60ft luxury motor yacht', icon: '🛥️', category: 'vehicle', base_price_cents: 75000000, volatility: 0.15, rarity: 'legendary', seed: 4004 },
  { id: 'trike', name: 'Custom Tricycle', description: 'Souped-up Filipino tricycle', icon: '🛺', category: 'vehicle', base_price_cents: 100000, volatility: 0.25, rarity: 'common', seed: 4005 },
  { id: 'helicopter', name: 'Robinson R44', description: 'Personal helicopter for island hopping', icon: '🚁', category: 'vehicle', base_price_cents: 40000000, volatility: 0.18, rarity: 'legendary', seed: 4006 },
];

export function seedMarketItems(): void {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO market_items (id, name, description, icon, category, base_price_cents, volatility, rarity, seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    for (const item of MARKET_ITEM_SEEDS) {
      insert.run(item.id, item.name, item.description, item.icon, item.category, item.base_price_cents, item.volatility, item.rarity, item.seed);
    }
  });

  run();
}

// ============ Public API ============
interface MarketItemRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  base_price_cents: number;
  volatility: number;
  rarity: string;
  available: number;
  seed: number;
}

export function getMarketItems(category?: string): MarketItemWithPrice[] {
  const query = category
    ? 'SELECT * FROM market_items WHERE available = 1 AND category = ?'
    : 'SELECT * FROM market_items WHERE available = 1';
  const items = (category
    ? db.prepare(query).all(category)
    : db.prepare(query).all()
  ) as MarketItemRow[];

  return items.map(item => {
    const current = getCurrentPrice(item.base_price_cents, item.volatility, item.seed);
    const previous = getPreviousPrice(item.base_price_cents, item.volatility, item.seed);
    const trend = previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      category: item.category as any,
      base_price_cents: item.base_price_cents,
      volatility: item.volatility,
      rarity: item.rarity as any,
      current_price_cents: current,
      previous_price_cents: previous,
      trend_percent: Math.round(trend * 100) / 100,
    };
  });
}

export function getMarketItemDetail(itemId: string, periods: number = 24): MarketItemDetail {
  const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(itemId) as MarketItemRow | undefined;
  if (!item) throw new Error('Item not found');

  const current = getCurrentPrice(item.base_price_cents, item.volatility, item.seed);
  const previous = getPreviousPrice(item.base_price_cents, item.volatility, item.seed);
  const trend = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const priceHistory = getPriceHistory(item, periods);

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    icon: item.icon,
    category: item.category as any,
    base_price_cents: item.base_price_cents,
    volatility: item.volatility,
    rarity: item.rarity as any,
    current_price_cents: current,
    previous_price_cents: previous,
    trend_percent: Math.round(trend * 100) / 100,
    price_history: priceHistory,
  };
}

function getPriceHistory(item: MarketItemRow, periods: number): PricePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: PricePoint[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    const ts = now - (i * PRICE_PERIOD_SECONDS);
    const price = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, ts);
    points.push({ timestamp: ts, price_cents: price });
  }

  return points;
}

export function getPriceHistoryForItem(itemId: string, periods: number = 24): PricePoint[] {
  const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(itemId) as MarketItemRow | undefined;
  if (!item) throw new Error('Item not found');
  return getPriceHistory(item, periods);
}

export function buyItem(userId: number, itemId: string, quantity: number = 1): MarketBuyResult {
  if (quantity < 1) throw new Error('Quantity must be at least 1');

  const item = db.prepare('SELECT * FROM market_items WHERE id = ? AND available = 1').get(itemId) as MarketItemRow | undefined;
  if (!item) throw new Error('Item not found or unavailable');

  const priceCents = getCurrentPrice(item.base_price_cents, item.volatility, item.seed);
  const totalCost = priceCents * quantity;

  const run = db.transaction(() => {
    const wallet = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number };
    if (wallet.balance_cents < totalCost) throw new Error('Insufficient balance');

    db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(totalCost, userId);

    db.prepare(
      'INSERT INTO user_inventory (user_id, item_id, quantity, purchased_price_cents) VALUES (?, ?, ?, ?)'
    ).run(userId, itemId, quantity, priceCents);

    db.prepare(
      'INSERT INTO market_transactions (user_id, item_id, action, quantity, price_cents) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, itemId, 'BUY', quantity, priceCents);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, -totalCost, 'MARKET_BUY', `Bought ${quantity}x ${item.name}`);

    return (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;
  });

  const newBalance = run();

  return {
    item_id: itemId,
    quantity,
    price_cents: priceCents,
    total_cost_cents: totalCost,
    new_balance_cents: newBalance,
  };
}

export function sellItem(userId: number, inventoryId: number): MarketSellResult {
  const run = db.transaction(() => {
    const inv = db.prepare('SELECT * FROM user_inventory WHERE id = ? AND user_id = ?').get(inventoryId, userId) as any;
    if (!inv) throw new Error('Inventory item not found');

    const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(inv.item_id) as MarketItemRow;
    const priceCents = getCurrentPrice(item.base_price_cents, item.volatility, item.seed);
    const totalRevenue = priceCents * inv.quantity;
    const profit = totalRevenue - (inv.purchased_price_cents * inv.quantity);

    db.prepare('DELETE FROM user_inventory WHERE id = ?').run(inventoryId);

    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(totalRevenue, userId);

    db.prepare(
      'INSERT INTO market_transactions (user_id, item_id, action, quantity, price_cents) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, inv.item_id, 'SELL', inv.quantity, priceCents);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, totalRevenue, 'MARKET_SELL', `Sold ${inv.quantity}x ${item.name}`);

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;

    return {
      item_id: inv.item_id,
      quantity: inv.quantity,
      price_cents: priceCents,
      total_revenue_cents: totalRevenue,
      profit_cents: profit,
      new_balance_cents: newBalance,
    };
  });

  return run();
}

export function getUserInventory(userId: number): InventoryItem[] {
  const items = db.prepare(
    `SELECT ui.id, ui.item_id, ui.quantity, ui.purchased_price_cents, ui.purchased_at,
            mi.name, mi.icon, mi.category, mi.rarity, mi.base_price_cents, mi.volatility, mi.seed
     FROM user_inventory ui
     JOIN market_items mi ON ui.item_id = mi.id
     WHERE ui.user_id = ?
     ORDER BY ui.purchased_at DESC`
  ).all(userId) as any[];

  return items.map(row => {
    const currentPrice = getCurrentPrice(row.base_price_cents, row.volatility, row.seed);
    return {
      id: row.id,
      item_id: row.item_id,
      name: row.name,
      icon: row.icon,
      category: row.category,
      rarity: row.rarity,
      quantity: row.quantity,
      purchased_price_cents: row.purchased_price_cents,
      current_price_cents: currentPrice,
      profit_cents: (currentPrice - row.purchased_price_cents) * row.quantity,
      purchased_at: row.purchased_at,
    };
  });
}

export function getMarketHistory(userId: number, limit: number = 20): MarketTransaction[] {
  return db.prepare(
    `SELECT mt.id, mt.item_id, mi.name as item_name, mt.action, mt.quantity, mt.price_cents, mt.timestamp
     FROM market_transactions mt
     JOIN market_items mi ON mt.item_id = mi.id
     WHERE mt.user_id = ?
     ORDER BY mt.timestamp DESC LIMIT ?`
  ).all(userId, limit) as MarketTransaction[];
}
