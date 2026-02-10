CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 100000,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BET','WIN','DEPOSIT')),
  game_type TEXT,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS game_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_type TEXT NOT NULL,
  server_seed TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  result_data TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ Bank ============
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  last_interest_at INTEGER NOT NULL DEFAULT (unixepoch()),
  total_interest_earned_cents INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DEPOSIT','WITHDRAW','INTEREST')),
  balance_after_cents INTEGER NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ Achievements ============
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('wealth','gambling','streak','collection','bank')),
  threshold INTEGER NOT NULL,
  reward_cents INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY,
  total_wagered_cents INTEGER NOT NULL DEFAULT 0,
  total_won_cents INTEGER NOT NULL DEFAULT 0,
  biggest_win_cents INTEGER NOT NULL DEFAULT 0,
  total_games_played INTEGER NOT NULL DEFAULT 0,
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  best_win_streak INTEGER NOT NULL DEFAULT 0,
  current_loss_streak INTEGER NOT NULL DEFAULT 0,
  worst_loss_streak INTEGER NOT NULL DEFAULT 0,
  games_per_type TEXT NOT NULL DEFAULT '{}',
  peak_balance_cents INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ Market ============
CREATE TABLE IF NOT EXISTS market_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('collectible','stock','property','vehicle')),
  base_price_cents INTEGER NOT NULL,
  volatility REAL NOT NULL DEFAULT 0.2,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK(rarity IN ('common','uncommon','rare','epic','legendary')),
  available INTEGER NOT NULL DEFAULT 1,
  seed INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchased_price_cents INTEGER NOT NULL,
  purchased_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES market_items(id)
);

CREATE TABLE IF NOT EXISTS market_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('BUY','SELL')),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES market_items(id)
);

-- ============ Meta Transactions ============
CREATE TABLE IF NOT EXISTS meta_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('BANK_DEPOSIT','BANK_WITHDRAW','BANK_INTEREST','MARKET_BUY','MARKET_SELL','ACHIEVEMENT_REWARD')),
  description TEXT,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
