import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', '..', '..', 'casino.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = ON');

// Run schema (creates tables if not exists - no-op for existing DB)
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Run migrations for existing databases that were created with older schemas
runMigrations();

function runMigrations(): void {
  // Temporarily disable FK checks during migration (table recreations break FK refs)
  db.pragma('foreign_keys = OFF');

  // Clean up leftover temp tables from old migration code
  db.exec('DROP TABLE IF EXISTS market_items_new');
  db.exec('DROP TABLE IF EXISTS meta_transactions_new');

  // Helper: safely check if a column exists
  function hasColumn(table: string, column: string): boolean {
    try {
      db.prepare(`SELECT ${column} FROM ${table} LIMIT 0`).run();
      return true;
    } catch {
      return false;
    }
  }

  // Helper: safely check if a CHECK constraint allows a value
  function checkAllows(table: string, testColumns: Record<string, string>, deleteWhere: string, deleteParams: string[]): boolean {
    const cols = Object.keys(testColumns);
    const vals = Object.values(testColumns);
    const placeholders = cols.map(() => '?').join(', ');
    try {
      db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      db.prepare(`DELETE FROM ${table} WHERE ${deleteWhere}`).run(...deleteParams);
      return true;
    } catch {
      return false;
    }
  }

  // Helper: recreate table with new schema, preserving data
  function recreateTable(tableName: string, newDDL: string): void {
    const tmpName = `${tableName}__migrate_tmp`;
    // Clean up any leftover temp table from a previous failed migration
    db.exec(`DROP TABLE IF EXISTS ${tmpName}`);
    db.exec(newDDL.replace(`CREATE TABLE ${tableName}`, `CREATE TABLE ${tmpName}`));
    db.exec(`INSERT INTO ${tmpName} SELECT * FROM ${tableName}`);
    db.exec(`DROP TABLE ${tableName}`);
    db.exec(`ALTER TABLE ${tmpName} RENAME TO ${tableName}`);
  }

  // 1. Add rent_rate column to market_items if missing
  if (!hasColumn('market_items', 'rent_rate')) {
    db.exec('ALTER TABLE market_items ADD COLUMN rent_rate REAL NOT NULL DEFAULT 0');
  }

  // 2. Add last_rent_at column to user_inventory if missing
  if (!hasColumn('user_inventory', 'last_rent_at')) {
    const nowEpoch = Math.floor(Date.now() / 1000);
    db.exec(`ALTER TABLE user_inventory ADD COLUMN last_rent_at INTEGER NOT NULL DEFAULT ${nowEpoch}`);
  }

  // 3. Migrate market_items CHECK constraint to include 'crypto'
  if (!checkAllows('market_items', {
    id: '__mig_test__', name: 't', description: 't', icon: 'x',
    category: 'crypto', base_price_cents: '1', volatility: '0.1',
    rarity: 'common', seed: '0', rent_rate: '0'
  }, "id = ?", ['__mig_test__'])) {
    recreateTable('market_items', `CREATE TABLE market_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('collectible','stock','property','vehicle','crypto')),
      base_price_cents INTEGER NOT NULL,
      volatility REAL NOT NULL DEFAULT 0.2,
      rarity TEXT NOT NULL DEFAULT 'common' CHECK(rarity IN ('common','uncommon','rare','epic','legendary')),
      available INTEGER NOT NULL DEFAULT 1,
      seed INTEGER NOT NULL,
      rent_rate REAL NOT NULL DEFAULT 0
    )`);
  }

  // 4. Migrate meta_transactions CHECK constraint to include all types
  if (!checkAllows('meta_transactions', {
    user_id: '0', amount_cents: '0', type: 'PRESTIGE', description: '__mig_test__'
  }, "user_id = 0 AND description = '__mig_test__'", [])) {
    recreateTable('meta_transactions', `CREATE TABLE meta_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('BANK_DEPOSIT','BANK_WITHDRAW','BANK_INTEREST','MARKET_BUY','MARKET_SELL','ACHIEVEMENT_REWARD','RENT','BUSINESS_PURCHASE','BUSINESS_INCOME','PRESTIGE')),
      description TEXT,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
  }

  // Re-enable FK checks
  db.pragma('foreign_keys = ON');
}

export default db;
