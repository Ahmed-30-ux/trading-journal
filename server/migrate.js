import pg from 'pg'

const { Pool } = pg

const SQL = `
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  market_type VARCHAR(20) NOT NULL DEFAULT 'stock',
  direction VARCHAR(10) NOT NULL DEFAULT 'long',
  entry_price DECIMAL(20,8) NOT NULL,
  exit_price DECIMAL(20,8),
  quantity DECIMAL(20,8) NOT NULL,
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  fees DECIMAL(20,2) DEFAULT 0,
  strategy VARCHAR(100) DEFAULT '',
  emotion VARCHAR(50) DEFAULT '',
  rating VARCHAR(1) DEFAULT '',
  tags TEXT DEFAULT '',
  checklist TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  current_price DECIMAL(20,8),
  pnl DECIMAL(20,8) DEFAULT 0,
  roi DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
`

export async function runMigration() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query(SQL)
    console.log('Database migration completed')
  } catch (e) {
    console.error('Migration failed:', e.message)
    throw e
  } finally {
    await pool.end()
  }
}
