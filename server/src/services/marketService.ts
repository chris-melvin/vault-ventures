import { createHash } from 'crypto';
import db from '../db/database.js';
import { getMultiplier } from './prestigeService.js';
import type {
  MarketItemWithPrice, MarketItemDetail, PricePoint,
  MarketBuyResult, MarketSellResult, InventoryItem, MarketTransaction, RentCollectionResult,
} from '../../../shared/types.ts';

// ============ Deterministic Pricing ============
const PRICE_PERIOD_SECONDS = 1800; // 30 minutes
const CRYPTO_PRICE_PERIOD_SECONDS = 300; // 5 minutes

function hashPrice(seed: number, timeBucket: number): number {
  const hash = createHash('sha256').update(`${seed}:${timeBucket}`).digest('hex');
  const value = parseInt(hash.substring(0, 8), 16);
  return value / 0xffffffff;
}

function getCurrentPrice(basePriceCents: number, volatility: number, seed: number, timestamp?: number, period?: number): number {
  const p = period ?? PRICE_PERIOD_SECONDS;
  const now = timestamp ?? Math.floor(Date.now() / 1000);
  const timeBucket = Math.floor(now / p);
  const hashVal = hashPrice(seed, timeBucket);
  const wave = (hashVal * 2) - 1;
  const price = Math.floor(basePriceCents * (1 + wave * volatility));
  return Math.max(Math.floor(basePriceCents * 0.1), price);
}

function getPreviousPrice(basePriceCents: number, volatility: number, seed: number, period?: number): number {
  const p = period ?? PRICE_PERIOD_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const prevTimestamp = now - p;
  return getCurrentPrice(basePriceCents, volatility, seed, prevTimestamp, p);
}

function getPeriodForCategory(category: string): number {
  return category === 'crypto' ? CRYPTO_PRICE_PERIOD_SECONDS : PRICE_PERIOD_SECONDS;
}

// ============ Seed Market Items ============
const MARKET_ITEM_SEEDS = [
  // ========== COLLECTIBLES ==========
  // Existing
  { id: 'lucky_gold_chip', name: 'Lucky Gold Chip', description: 'A rare gold casino chip from the old days', icon: '🪙', category: 'collectible', base_price_cents: 50000, volatility: 0.25, rarity: 'uncommon', seed: 1001, rent_rate: 0 },
  { id: 'vintage_cards', name: 'Vintage Playing Cards', description: 'A pristine deck from 1960s Manila', icon: '🃏', category: 'collectible', base_price_cents: 30000, volatility: 0.2, rarity: 'common', seed: 1002, rent_rate: 0 },
  { id: 'crystal_dice', name: 'Crystal Dice Set', description: 'Hand-carved crystal dice with gold pips', icon: '🎲', category: 'collectible', base_price_cents: 150000, volatility: 0.3, rarity: 'rare', seed: 1003, rent_rate: 0 },
  { id: 'manila_painting', name: 'Manila Bay Painting', description: 'Original oil painting of Manila Bay sunset', icon: '🖼️', category: 'collectible', base_price_cents: 500000, volatility: 0.35, rarity: 'epic', seed: 1004, rent_rate: 0 },
  { id: 'pearl_necklace', name: 'South Sea Pearl Necklace', description: 'Lustrous pearls from Palawan', icon: '📿', category: 'collectible', base_price_cents: 800000, volatility: 0.4, rarity: 'epic', seed: 1005, rent_rate: 0 },
  { id: 'golden_tarsier', name: 'Golden Tarsier Figurine', description: 'Solid gold tarsier statuette', icon: '🐒', category: 'collectible', base_price_cents: 2000000, volatility: 0.3, rarity: 'legendary', seed: 1006, rent_rate: 0 },
  { id: 'ruby_ring', name: 'Pigeon Blood Ruby Ring', description: 'Extremely rare Burmese ruby', icon: '💍', category: 'collectible', base_price_cents: 5000000, volatility: 0.35, rarity: 'legendary', seed: 1007, rent_rate: 0 },
  // New collectibles
  { id: 'antique_fan', name: 'Antique Abanico Fan', description: 'Hand-painted silk fan from the Spanish era', icon: '🪭', category: 'collectible', base_price_cents: 15000, volatility: 0.2, rarity: 'common', seed: 1008, rent_rate: 0 },
  { id: 'vintage_watch', name: 'Vintage Rolex Datejust', description: 'A 1970s Rolex found in a pawnshop', icon: '⌚', category: 'collectible', base_price_cents: 350000, volatility: 0.3, rarity: 'rare', seed: 1009, rent_rate: 0 },
  { id: 'manga_collection', name: 'Rare Manga Collection', description: 'First edition Voltes V manga set', icon: '📚', category: 'collectible', base_price_cents: 25000, volatility: 0.25, rarity: 'common', seed: 1010, rent_rate: 0 },
  { id: 'signed_basketball', name: 'Signed Gilas Basketball', description: 'Game ball signed by the national team', icon: '🏀', category: 'collectible', base_price_cents: 75000, volatility: 0.35, rarity: 'uncommon', seed: 1011, rent_rate: 0 },
  { id: 'retro_console', name: 'Family Computer (Famicom)', description: 'Mint condition retro gaming console', icon: '🎮', category: 'collectible', base_price_cents: 40000, volatility: 0.2, rarity: 'uncommon', seed: 1012, rent_rate: 0 },
  { id: 'jade_buddha', name: 'Jade Buddha Statue', description: 'Carved jade Buddha from Chinatown antique shop', icon: '🧘', category: 'collectible', base_price_cents: 200000, volatility: 0.3, rarity: 'rare', seed: 1013, rent_rate: 0 },
  { id: 'barong_tagalog', name: 'Antique Barong Tagalog', description: 'Piña cloth barong worn by a governor', icon: '👔', category: 'collectible', base_price_cents: 120000, volatility: 0.25, rarity: 'rare', seed: 1014, rent_rate: 0 },
  { id: 'old_peso', name: '1903 Silver Peso', description: 'American colonial era silver coin', icon: '🥈', category: 'collectible', base_price_cents: 60000, volatility: 0.3, rarity: 'uncommon', seed: 1015, rent_rate: 0 },
  { id: 'santos_painting', name: 'Santo Niño Oil Painting', description: 'Religious art from a Cebu chapel', icon: '🎨', category: 'collectible', base_price_cents: 250000, volatility: 0.35, rarity: 'rare', seed: 1016, rent_rate: 0 },
  { id: 'guitar_collection', name: 'Cebu Guitar Set', description: 'Handcrafted guitars from Mactan', icon: '🎸', category: 'collectible', base_price_cents: 80000, volatility: 0.2, rarity: 'uncommon', seed: 1017, rent_rate: 0 },
  { id: 'pearl_earrings', name: 'Golden Pearl Earrings', description: 'Rare golden pearls from Mindanao', icon: '✨', category: 'collectible', base_price_cents: 450000, volatility: 0.35, rarity: 'epic', seed: 1018, rent_rate: 0 },
  { id: 'ancient_jar', name: 'Ming Dynasty Jar', description: 'Shipwreck pottery from the South China Sea', icon: '🏺', category: 'collectible', base_price_cents: 1500000, volatility: 0.4, rarity: 'epic', seed: 1019, rent_rate: 0 },

  // ========== STOCKS ==========
  // Existing
  { id: 'jollibee_stock', name: 'Jollibee Corp', description: 'JFC - The beloved fast food giant', icon: '🐝', category: 'stock', base_price_cents: 25000, volatility: 0.35, rarity: 'common', seed: 2001, rent_rate: 0 },
  { id: 'sm_stock', name: 'SM Holdings', description: 'SMPH - Mall empire conglomerate', icon: '🏬', category: 'stock', base_price_cents: 40000, volatility: 0.4, rarity: 'common', seed: 2002, rent_rate: 0 },
  { id: 'casino_inc', name: 'Manila Casino Inc', description: 'MCR - Casino operator stock', icon: '🎰', category: 'stock', base_price_cents: 75000, volatility: 0.5, rarity: 'uncommon', seed: 2003, rent_rate: 0 },
  { id: 'pacific_air', name: 'Pacific Airlines', description: 'PAL - Flag carrier airline', icon: '✈️', category: 'stock', base_price_cents: 15000, volatility: 0.55, rarity: 'common', seed: 2004, rent_rate: 0 },
  { id: 'ayala_land', name: 'Ayala Land', description: 'ALI - Premier property developer', icon: '🏗️', category: 'stock', base_price_cents: 35000, volatility: 0.3, rarity: 'common', seed: 2005, rent_rate: 0 },
  { id: 'globe_tel', name: 'Globe Telecom', description: 'GLO - Major telco provider', icon: '📱', category: 'stock', base_price_cents: 30000, volatility: 0.45, rarity: 'common', seed: 2006, rent_rate: 0 },
  { id: 'bdo_bank', name: 'BDO Unibank', description: 'BDO - Largest bank by assets', icon: '🏦', category: 'stock', base_price_cents: 20000, volatility: 0.35, rarity: 'common', seed: 2007, rent_rate: 0 },
  { id: 'crypto_peso', name: 'CryptoPeso Token', description: 'CPT - Volatile crypto token', icon: '₿', category: 'stock', base_price_cents: 10000, volatility: 0.6, rarity: 'uncommon', seed: 2008, rent_rate: 0 },
  // New regular stocks
  { id: 'meralco_stock', name: 'Meralco', description: 'MER - Power distribution monopoly', icon: '⚡', category: 'stock', base_price_cents: 32000, volatility: 0.2, rarity: 'common', seed: 2009, rent_rate: 0 },
  { id: 'pldt_stock', name: 'PLDT Inc', description: 'TEL - Telecom and digital services', icon: '📡', category: 'stock', base_price_cents: 28000, volatility: 0.25, rarity: 'common', seed: 2010, rent_rate: 0 },
  { id: 'megaworld_stock', name: 'Megaworld Corp', description: 'MEG - Township developer', icon: '🏙️', category: 'stock', base_price_cents: 8000, volatility: 0.4, rarity: 'common', seed: 2011, rent_rate: 0 },
  { id: 'san_miguel', name: 'San Miguel Corp', description: 'SMC - Beer, food, and infrastructure', icon: '🍺', category: 'stock', base_price_cents: 22000, volatility: 0.3, rarity: 'common', seed: 2012, rent_rate: 0 },
  { id: 'puregold', name: 'Puregold Price Club', description: 'PGOLD - Grocery retail chain', icon: '🛒', category: 'stock', base_price_cents: 12000, volatility: 0.2, rarity: 'common', seed: 2013, rent_rate: 0 },
  { id: 'robinsons_land', name: 'Robinsons Land', description: 'RLC - Mall and property developer', icon: '🏪', category: 'stock', base_price_cents: 18000, volatility: 0.3, rarity: 'common', seed: 2014, rent_rate: 0 },
  { id: 'bpi_stock', name: 'Bank of PI', description: 'BPI - Heritage banking institution', icon: '💰', category: 'stock', base_price_cents: 26000, volatility: 0.15, rarity: 'common', seed: 2015, rent_rate: 0 },
  { id: 'aboitiz_power', name: 'Aboitiz Power', description: 'AP - Power generation company', icon: '🔋', category: 'stock', base_price_cents: 15000, volatility: 0.25, rarity: 'common', seed: 2016, rent_rate: 0 },
  // Penny stocks (cheap + high volatility)
  { id: 'penny_dragonfi', name: 'DragonFi Labs', description: 'DRFI - Experimental AI startup, pre-revenue', icon: '🐉', category: 'stock', base_price_cents: 200, volatility: 0.75, rarity: 'common', seed: 2101, rent_rate: 0 },
  { id: 'penny_moonmine', name: 'MoonMine Corp', description: 'MNMN - Asteroid mining speculative play', icon: '🌙', category: 'stock', base_price_cents: 50, volatility: 0.85, rarity: 'common', seed: 2102, rent_rate: 0 },
  { id: 'penny_aquafarm', name: 'AquaFarm PH', description: 'AQFM - Seaweed and tilapia micro-farm', icon: '🐟', category: 'stock', base_price_cents: 150, volatility: 0.7, rarity: 'common', seed: 2103, rent_rate: 0 },
  { id: 'penny_jeepev', name: 'JeepEV Motors', description: 'JPEV - Electric jeepney startup', icon: '🔌', category: 'stock', base_price_cents: 500, volatility: 0.65, rarity: 'common', seed: 2104, rent_rate: 0 },
  { id: 'penny_nftisland', name: 'NFT Island', description: 'NFTI - Digital real estate tokens, highly volatile', icon: '🏝️', category: 'stock', base_price_cents: 100, volatility: 0.9, rarity: 'common', seed: 2105, rent_rate: 0 },
  { id: 'penny_volcanbrew', name: 'Volcan Brew Co', description: 'VLCN - Craft beer from volcanic spring water', icon: '🌋', category: 'stock', base_price_cents: 300, volatility: 0.6, rarity: 'common', seed: 2106, rent_rate: 0 },
  { id: 'penny_bambootech', name: 'BambooTech', description: 'BMBT - Bamboo-based construction materials', icon: '🎋', category: 'stock', base_price_cents: 250, volatility: 0.55, rarity: 'common', seed: 2107, rent_rate: 0 },
  { id: 'penny_calamansi', name: 'Calamansi Gold', description: 'CLMG - Calamansi extract skincare line', icon: '🍋', category: 'stock', base_price_cents: 80, volatility: 0.8, rarity: 'common', seed: 2108, rent_rate: 0 },
  { id: 'penny_reef', name: 'ReefDAO', description: 'REEF - Decentralized coral reef conservation', icon: '🪸', category: 'stock', base_price_cents: 30, volatility: 0.9, rarity: 'common', seed: 2109, rent_rate: 0 },
  { id: 'penny_kaizen', name: 'Kaizen Robotics', description: 'KZRB - Warehouse automation, early stage', icon: '🤖', category: 'stock', base_price_cents: 400, volatility: 0.7, rarity: 'common', seed: 2110, rent_rate: 0 },
  { id: 'penny_saritoken', name: 'SariSari Token', description: 'SARI - Blockchain loyalty points for corner stores', icon: '🏪', category: 'stock', base_price_cents: 20, volatility: 0.95, rarity: 'common', seed: 2111, rent_rate: 0 },
  { id: 'penny_typhoon', name: 'Typhoon Energy', description: 'TYPH - Wind power from typhoon corridors', icon: '🌀', category: 'stock', base_price_cents: 350, volatility: 0.6, rarity: 'common', seed: 2112, rent_rate: 0 },

  // ========== PROPERTY (with rent) ==========
  // Affordable properties
  { id: 'bed_space', name: 'Bed Space in Tondo', description: 'A single bed space in a shared room', icon: '🛏️', category: 'property', base_price_cents: 20000, volatility: 0.05, rarity: 'common', seed: 3101, rent_rate: 0.005 },
  { id: 'market_stall', name: 'Divisoria Market Stall', description: 'Small stall in the busiest market in Manila', icon: '🏪', category: 'property', base_price_cents: 150000, volatility: 0.08, rarity: 'common', seed: 3102, rent_rate: 0.0035 },
  { id: 'food_cart', name: 'Fishball Cart Franchise', description: 'Street food cart near a school', icon: '🍢', category: 'property', base_price_cents: 80000, volatility: 0.1, rarity: 'common', seed: 3103, rent_rate: 0.004 },
  { id: 'sari_sari', name: 'Sari-Sari Store', description: 'Neighborhood convenience store in the barangay', icon: '🧃', category: 'property', base_price_cents: 200000, volatility: 0.06, rarity: 'common', seed: 3104, rent_rate: 0.003 },
  { id: 'water_station', name: 'Water Refilling Station', description: 'Purified water business in a subdivision', icon: '💧', category: 'property', base_price_cents: 600000, volatility: 0.05, rarity: 'uncommon', seed: 3105, rent_rate: 0.0025 },
  { id: 'parking_space', name: 'Parking Space in Makati', description: 'Reserved lot in a CBD building', icon: '🅿️', category: 'property', base_price_cents: 500000, volatility: 0.04, rarity: 'uncommon', seed: 3106, rent_rate: 0.002 },
  { id: 'internet_cafe', name: 'Internet Cafe', description: '20-PC computer shop near a university', icon: '🖥️', category: 'property', base_price_cents: 800000, volatility: 0.08, rarity: 'uncommon', seed: 3107, rent_rate: 0.003 },
  { id: 'laundromat', name: 'Coin Laundry Shop', description: 'Self-service laundromat in a condo area', icon: '🧺', category: 'property', base_price_cents: 1200000, volatility: 0.05, rarity: 'uncommon', seed: 3108, rent_rate: 0.002 },
  { id: 'karaoke_bar', name: 'KTV Karaoke Bar', description: '8-room karaoke joint in Pasay', icon: '🎤', category: 'property', base_price_cents: 1500000, volatility: 0.1, rarity: 'rare', seed: 3109, rent_rate: 0.0025 },
  { id: 'rice_paddy', name: 'Rice Paddy in Nueva Ecija', description: '1 hectare irrigated rice field', icon: '🌾', category: 'property', base_price_cents: 300000, volatility: 0.04, rarity: 'common', seed: 3110, rent_rate: 0.0015 },
  { id: 'fish_pen', name: 'Fish Pen in Laguna de Bay', description: 'Milkfish aquaculture pen', icon: '🐠', category: 'property', base_price_cents: 400000, volatility: 0.08, rarity: 'common', seed: 3111, rent_rate: 0.002 },
  { id: 'boarding_house', name: 'Boarding House', description: '6-room boarding house near UST', icon: '🏠', category: 'property', base_price_cents: 2500000, volatility: 0.06, rarity: 'rare', seed: 3112, rent_rate: 0.002 },
  { id: 'storage_unit', name: 'Storage Unit', description: 'Climate-controlled storage in Quezon City', icon: '📦', category: 'property', base_price_cents: 350000, volatility: 0.04, rarity: 'common', seed: 3113, rent_rate: 0.002 },
  { id: 'jeepney_route', name: 'Jeepney Route Franchise', description: 'Franchise rights for a busy route', icon: '🚐', category: 'property', base_price_cents: 2000000, volatility: 0.06, rarity: 'rare', seed: 3114, rent_rate: 0.002 },
  { id: 'carwash', name: 'Car Wash Station', description: 'Automated car wash on a main road', icon: '🚿', category: 'property', base_price_cents: 1800000, volatility: 0.07, rarity: 'rare', seed: 3115, rent_rate: 0.0022 },
  { id: 'small_apartment', name: 'Studio Apartment in QC', description: 'Small apartment unit near MRT', icon: '🚪', category: 'property', base_price_cents: 3500000, volatility: 0.06, rarity: 'rare', seed: 3116, rent_rate: 0.0018 },
  { id: 'mango_farm', name: 'Mango Farm in Guimaras', description: '2 hectares of sweet mango trees', icon: '🥭', category: 'property', base_price_cents: 1000000, volatility: 0.05, rarity: 'uncommon', seed: 3117, rent_rate: 0.0015 },
  { id: 'coffee_farm', name: 'Coffee Farm in Benguet', description: 'Arabica coffee plantation in the highlands', icon: '☕', category: 'property', base_price_cents: 1500000, volatility: 0.06, rarity: 'uncommon', seed: 3118, rent_rate: 0.0018 },
  { id: 'ukay_shop', name: 'Ukay-Ukay Warehouse', description: 'Thrift clothing warehouse with loyal buyers', icon: '👕', category: 'property', base_price_cents: 250000, volatility: 0.08, rarity: 'common', seed: 3119, rent_rate: 0.003 },
  { id: 'bangus_farm', name: 'Bangus Farm in Dagupan', description: 'Milkfish pond producing daily harvests', icon: '🐟', category: 'property', base_price_cents: 700000, volatility: 0.06, rarity: 'uncommon', seed: 3120, rent_rate: 0.002 },
  // Existing (now with rent)
  { id: 'makati_condo', name: 'Condo in Makati', description: 'Studio unit in the business district', icon: '🏢', category: 'property', base_price_cents: 5000000, volatility: 0.08, rarity: 'rare', seed: 3001, rent_rate: 0.0015 },
  { id: 'boracay_house', name: 'Beach House in Boracay', description: 'Beachfront villa on White Beach', icon: '🏖️', category: 'property', base_price_cents: 15000000, volatility: 0.1, rarity: 'epic', seed: 3002, rent_rate: 0.001 },
  { id: 'bgc_penthouse', name: 'Penthouse in BGC', description: 'Luxury penthouse with skyline view', icon: '🌆', category: 'property', base_price_cents: 50000000, volatility: 0.05, rarity: 'legendary', seed: 3003, rent_rate: 0.0008 },
  { id: 'tagaytay_lot', name: 'Tagaytay Hilltop Lot', description: 'Prime lot with Taal volcano view', icon: '⛰️', category: 'property', base_price_cents: 8000000, volatility: 0.12, rarity: 'rare', seed: 3004, rent_rate: 0.001 },
  { id: 'palawan_resort', name: 'Palawan Island Resort', description: 'Private island resort in El Nido', icon: '🏝️', category: 'property', base_price_cents: 100000000, volatility: 0.07, rarity: 'legendary', seed: 3005, rent_rate: 0.0006 },

  // ========== VEHICLES ==========
  { id: 'jeepney', name: 'Classic Jeepney', description: 'Restored vintage Philippine jeepney', icon: '🚌', category: 'vehicle', base_price_cents: 500000, volatility: 0.15, rarity: 'uncommon', seed: 4001, rent_rate: 0 },
  { id: 'fortuner', name: 'Toyota Fortuner', description: 'Popular mid-size SUV', icon: '🚙', category: 'vehicle', base_price_cents: 2000000, volatility: 0.12, rarity: 'rare', seed: 4002, rent_rate: 0 },
  { id: 'lambo', name: 'Lamborghini Huracan', description: 'Italian supercar with V10 engine', icon: '🏎️', category: 'vehicle', base_price_cents: 25000000, volatility: 0.2, rarity: 'epic', seed: 4003, rent_rate: 0 },
  { id: 'yacht', name: 'Luxury Yacht', description: '60ft luxury motor yacht', icon: '🛥️', category: 'vehicle', base_price_cents: 75000000, volatility: 0.15, rarity: 'legendary', seed: 4004, rent_rate: 0 },
  { id: 'trike', name: 'Custom Tricycle', description: 'Souped-up Filipino tricycle', icon: '🛺', category: 'vehicle', base_price_cents: 100000, volatility: 0.25, rarity: 'common', seed: 4005, rent_rate: 0 },
  { id: 'helicopter', name: 'Robinson R44', description: 'Personal helicopter for island hopping', icon: '🚁', category: 'vehicle', base_price_cents: 40000000, volatility: 0.18, rarity: 'legendary', seed: 4006, rent_rate: 0 },

  // ========== CRYPTO ==========
  { id: 'lucky7coin', name: 'Lucky7Coin', description: 'Community-driven lucky number token', icon: '🎰', category: 'crypto', base_price_cents: 500, volatility: 0.95, rarity: 'common', seed: 5001, rent_rate: 0 },
  { id: 'jackpot_token', name: 'JackpotToken', description: 'Deflationary token with burn mechanics', icon: '💎', category: 'crypto', base_price_cents: 2000, volatility: 0.90, rarity: 'uncommon', seed: 5002, rent_rate: 0 },
  { id: 'whalecoin', name: 'WhaleCoin', description: 'Blue-chip casino governance token', icon: '🐋', category: 'crypto', base_price_cents: 10000, volatility: 0.85, rarity: 'rare', seed: 5003, rent_rate: 0 },
  { id: 'degendao', name: 'DegenDAO', description: 'Decentralized degen community fund', icon: '🦧', category: 'crypto', base_price_cents: 100, volatility: 0.98, rarity: 'common', seed: 5004, rent_rate: 0 },
  { id: 'diamondhands', name: 'DiamondHands', description: 'HODL-incentivized staking token', icon: '💠', category: 'crypto', base_price_cents: 5000, volatility: 0.88, rarity: 'uncommon', seed: 5005, rent_rate: 0 },
  { id: 'moonshot', name: 'MoonShot', description: 'Meme coin with volatile price action', icon: '🚀', category: 'crypto', base_price_cents: 300, volatility: 0.95, rarity: 'common', seed: 5006, rent_rate: 0 },
  { id: 'rugpull', name: 'RugPull', description: 'Suspiciously promising DeFi protocol', icon: '🧶', category: 'crypto', base_price_cents: 50, volatility: 0.99, rarity: 'common', seed: 5007, rent_rate: 0 },
  { id: 'casinonft', name: 'CasinoNFT', description: 'Fractional casino ownership NFT', icon: '🎭', category: 'crypto', base_price_cents: 1500, volatility: 0.92, rarity: 'uncommon', seed: 5008, rent_rate: 0 },
];

// Migrations are now handled centrally in database.ts

export function seedMarketItems(): void {

  const insert = db.prepare(
    'INSERT OR IGNORE INTO market_items (id, name, description, icon, category, base_price_cents, volatility, rarity, seed, rent_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );

  // Also update existing items with rent rates
  const updateRent = db.prepare('UPDATE market_items SET rent_rate = ? WHERE id = ? AND rent_rate = 0 AND ? > 0');

  const run = db.transaction(() => {
    for (const item of MARKET_ITEM_SEEDS) {
      insert.run(item.id, item.name, item.description, item.icon, item.category, item.base_price_cents, item.volatility, item.rarity, item.seed, item.rent_rate);
      if (item.rent_rate > 0) {
        updateRent.run(item.rent_rate, item.id, item.rent_rate);
      }
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
  rent_rate: number;
}

export function getMarketItems(category?: string): MarketItemWithPrice[] {
  let query: string;
  if (category) {
    query = 'SELECT * FROM market_items WHERE available = 1 AND category = ?';
  } else {
    // Default "All" excludes crypto
    query = "SELECT * FROM market_items WHERE available = 1 AND category != 'crypto'";
  }
  const items = (category
    ? db.prepare(query).all(category)
    : db.prepare(query).all()
  ) as MarketItemRow[];

  return items.map(item => {
    const period = getPeriodForCategory(item.category);
    const current = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, undefined, period);
    const previous = getPreviousPrice(item.base_price_cents, item.volatility, item.seed, period);
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
      rent_rate: item.rent_rate || 0,
      current_price_cents: current,
      previous_price_cents: previous,
      trend_percent: Math.round(trend * 100) / 100,
    };
  });
}

export function getMarketItemDetail(itemId: string, periods: number = 24): MarketItemDetail {
  const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(itemId) as MarketItemRow | undefined;
  if (!item) throw new Error('Item not found');

  const period = getPeriodForCategory(item.category);
  const current = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, undefined, period);
  const previous = getPreviousPrice(item.base_price_cents, item.volatility, item.seed, period);
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
    rent_rate: item.rent_rate || 0,
    current_price_cents: current,
    previous_price_cents: previous,
    trend_percent: Math.round(trend * 100) / 100,
    price_history: priceHistory,
  };
}

function getPriceHistory(item: MarketItemRow, periods: number): PricePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const period = getPeriodForCategory(item.category);
  const points: PricePoint[] = [];

  for (let i = periods - 1; i >= 0; i--) {
    const ts = now - (i * period);
    const price = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, ts, period);
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

  // Collectibles and vehicles are unique items - only 1 per purchase
  if ((item.category === 'collectible' || item.category === 'vehicle') && quantity > 1) {
    quantity = 1;
  }

  const period = getPeriodForCategory(item.category);
  const priceCents = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, undefined, period);
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
    const period = getPeriodForCategory(item.category);
    const priceCents = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, undefined, period);
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
    `SELECT ui.item_id,
            SUM(ui.quantity) as total_quantity,
            SUM(ui.quantity * ui.purchased_price_cents) as total_cost,
            MIN(ui.id) as first_id,
            MAX(ui.purchased_at) as latest_at,
            MIN(ui.last_rent_at) as earliest_rent_at,
            mi.name, mi.icon, mi.category, mi.rarity, mi.base_price_cents, mi.volatility, mi.seed, mi.rent_rate
     FROM user_inventory ui
     JOIN market_items mi ON ui.item_id = mi.id
     WHERE ui.user_id = ?
     GROUP BY ui.item_id
     ORDER BY latest_at DESC`
  ).all(userId) as any[];

  const now = Math.floor(Date.now() / 1000);

  return items.map(row => {
    const currentPrice = getCurrentPrice(row.base_price_cents, row.volatility, row.seed);
    const avgPurchasePrice = Math.round(row.total_cost / row.total_quantity);
    const rentRate = row.rent_rate || 0;

    // Calculate pending rent
    let pendingRent = 0;
    if (rentRate > 0) {
      const lastRentAt = row.earliest_rent_at || row.latest_at;
      const hoursElapsed = (now - lastRentAt) / 3600;
      pendingRent = Math.floor(currentPrice * row.total_quantity * rentRate * hoursElapsed);
    }

    return {
      id: row.first_id,
      item_id: row.item_id,
      name: row.name,
      icon: row.icon,
      category: row.category,
      rarity: row.rarity,
      quantity: row.total_quantity,
      purchased_price_cents: avgPurchasePrice,
      current_price_cents: currentPrice,
      profit_cents: (currentPrice - avgPurchasePrice) * row.total_quantity,
      purchased_at: row.latest_at,
      rent_rate: rentRate,
      pending_rent_cents: pendingRent,
    };
  });
}

export function collectRent(userId: number): RentCollectionResult {
  const now = Math.floor(Date.now() / 1000);

  const run = db.transaction(() => {
    // Get all inventory rows with rent-generating items
    const rows = db.prepare(
      `SELECT ui.id, ui.item_id, ui.quantity, ui.last_rent_at,
              mi.base_price_cents, mi.volatility, mi.seed, mi.rent_rate
       FROM user_inventory ui
       JOIN market_items mi ON ui.item_id = mi.id
       WHERE ui.user_id = ? AND mi.rent_rate > 0`
    ).all(userId) as any[];

    let totalRent = 0;
    let propertiesCollected = 0;
    const prestigeMultiplier = getMultiplier(userId);

    for (const row of rows) {
      const lastRentAt = row.last_rent_at || now;
      const hoursElapsed = (now - lastRentAt) / 3600;
      if (hoursElapsed <= 0) continue;

      const currentPrice = getCurrentPrice(row.base_price_cents, row.volatility, row.seed);
      let rent = Math.floor(currentPrice * row.quantity * row.rent_rate * hoursElapsed);
      if (rent <= 0) continue;
      // Apply prestige multiplier to rent
      if (prestigeMultiplier > 1.0) rent = Math.floor(rent * prestigeMultiplier);

      totalRent += rent;
      propertiesCollected++;

      // Update last_rent_at
      db.prepare('UPDATE user_inventory SET last_rent_at = ? WHERE id = ?').run(now, row.id);
    }

    if (totalRent > 0) {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(totalRent, userId);
      db.prepare(
        'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
      ).run(userId, totalRent, 'RENT', `Collected rent from ${propertiesCollected} properties`);
    }

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;

    return {
      total_rent_cents: totalRent,
      properties_collected: propertiesCollected,
      new_balance_cents: newBalance,
    };
  });

  return run();
}

export function sellPosition(userId: number, itemId: string): MarketSellResult {
  const run = db.transaction(() => {
    const rows = db.prepare('SELECT * FROM user_inventory WHERE user_id = ? AND item_id = ?').all(userId, itemId) as any[];
    if (rows.length === 0) throw new Error('No holdings found for this item');

    const item = db.prepare('SELECT * FROM market_items WHERE id = ?').get(itemId) as MarketItemRow;
    const period = getPeriodForCategory(item.category);
    const priceCents = getCurrentPrice(item.base_price_cents, item.volatility, item.seed, undefined, period);

    let totalQuantity = 0;
    let totalOrigCost = 0;
    for (const row of rows) {
      totalQuantity += row.quantity;
      totalOrigCost += row.purchased_price_cents * row.quantity;
    }

    const totalRevenue = priceCents * totalQuantity;
    const profit = totalRevenue - totalOrigCost;

    db.prepare('DELETE FROM user_inventory WHERE user_id = ? AND item_id = ?').run(userId, itemId);

    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(totalRevenue, userId);

    db.prepare(
      'INSERT INTO market_transactions (user_id, item_id, action, quantity, price_cents) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, itemId, 'SELL', totalQuantity, priceCents);

    db.prepare(
      'INSERT INTO meta_transactions (user_id, amount_cents, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, totalRevenue, 'MARKET_SELL', `Sold ${totalQuantity}x ${item.name}`);

    const newBalance = (db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId) as { balance_cents: number }).balance_cents;

    return {
      item_id: itemId,
      quantity: totalQuantity,
      price_cents: priceCents,
      total_revenue_cents: totalRevenue,
      profit_cents: profit,
      new_balance_cents: newBalance,
    };
  });

  return run();
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
