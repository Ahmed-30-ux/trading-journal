import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '..', 'data', 'trades.json')

const { Pool } = pg

let pool = null
let jsonTrades = []
let jsonNextId = 1

function isPgEnabled() {
  return !!process.env.DATABASE_URL
}

function getPool() {
  if (!pool && isPgEnabled()) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

function toCamel(row) {
  if (!row) return null
  const map = {
    id: 'id', date: 'date', symbol: 'symbol',
    market_type: 'marketType', direction: 'direction',
    entry_price: 'entryPrice', exit_price: 'exitPrice',
    quantity: 'quantity', stop_loss: 'stopLoss',
    take_profit: 'takeProfit', fees: 'fees',
    strategy: 'strategy', emotion: 'emotion',
    rating: 'rating', tags: 'tags',
    checklist: 'checklist', notes: 'notes',
    current_price: 'currentPrice',
    pnl: 'pnl', roi: 'roi',
    created_at: 'createdAt', updated_at: 'updatedAt',
  }
  const result = {}
  for (const [k, v] of Object.entries(row)) {
    result[map[k] || k] = v
  }
  return result
}

function toSnake(obj) {
  const map = {
    id: 'id', date: 'date', symbol: 'symbol',
    marketType: 'market_type', direction: 'direction',
    entryPrice: 'entry_price', exitPrice: 'exit_price',
    quantity: 'quantity', stopLoss: 'stop_loss',
    takeProfit: 'take_profit', fees: 'fees',
    strategy: 'strategy', emotion: 'emotion',
    rating: 'rating', tags: 'tags',
    checklist: 'checklist', notes: 'notes',
    currentPrice: 'current_price',
    pnl: 'pnl', roi: 'roi',
  }
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && map[k]) result[map[k]] = v
  }
  return result
}

// ---- JSON file fallback ----
function loadJson() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      const data = JSON.parse(raw)
      jsonTrades = data.trades || []
      jsonNextId = data.nextId || 1
    }
  } catch { jsonTrades = []; jsonNextId = 1 }
}

function saveJson() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ trades: jsonTrades, nextId: jsonNextId }, null, 2))
  } catch {}
}

// ---- Public API ----
export async function getAll() {
  if (isPgEnabled()) {
    const { rows } = await getPool().query('SELECT * FROM trades ORDER BY date DESC')
    return rows.map(toCamel)
  }
  return jsonTrades
}

export async function getById(id) {
  if (isPgEnabled()) {
    const { rows } = await getPool().query('SELECT * FROM trades WHERE id = $1', [id])
    return toCamel(rows[0]) || null
  }
  return jsonTrades.find(t => t.id === id) || null
}

export async function create(trade) {
  if (isPgEnabled()) {
    const sn = toSnake(trade)
    const cols = Object.keys(sn)
    const vals = Object.values(sn)
    const placeholders = vals.map((_, i) => `$${i + 1}`)
    const { rows } = await getPool().query(
      `INSERT INTO trades (${cols.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
      vals
    )
    return toCamel(rows[0])
  }
  const entry = { id: jsonNextId++, ...trade, createdAt: new Date().toISOString() }
  jsonTrades.push(entry)
  saveJson()
  return entry
}

export async function bulkCreate(newTrades) {
  if (isPgEnabled()) {
    const created = []
    for (const t of newTrades) {
      created.push(await create(t))
    }
    return created
  }
  const created = []
  for (const t of newTrades) {
    const entry = { id: jsonNextId++, ...t, createdAt: new Date().toISOString() }
    jsonTrades.push(entry)
    created.push(entry)
  }
  saveJson()
  return created
}

export async function update(id, updates) {
  if (isPgEnabled()) {
    const sn = toSnake(updates)
    const cols = Object.keys(sn)
    const vals = Object.values(sn)
    const setClause = cols.map((c, i) => `${c} = $${i + 2}`).join(',')
    vals.push(new Date().toISOString())
    const { rows } = await getPool().query(
      `UPDATE trades SET ${setClause}, updated_at = $${vals.length} WHERE id = $1 RETURNING *`,
      [id, ...vals]
    )
    return toCamel(rows[0]) || null
  }
  const idx = jsonTrades.findIndex(t => t.id === id)
  if (idx === -1) return null
  jsonTrades[idx] = { ...jsonTrades[idx], ...updates, updatedAt: new Date().toISOString() }
  saveJson()
  return jsonTrades[idx]
}

export async function remove(id) {
  if (isPgEnabled()) {
    const { rowCount } = await getPool().query('DELETE FROM trades WHERE id = $1', [id])
    return rowCount > 0
  }
  const idx = jsonTrades.findIndex(t => t.id === id)
  if (idx === -1) return false
  jsonTrades.splice(idx, 1)
  saveJson()
  return true
}

export async function query(options = {}) {
  const { search, marketType, direction, status, sortBy, sortOrder, page, limit } = options

  if (isPgEnabled()) {
    let sql = 'SELECT * FROM trades WHERE 1=1'
    const params = []
    let idx = 1

    if (status === 'open') { sql += ' AND (exit_price IS NULL OR exit_price = 0)' }
    else if (status === 'closed') { sql += ' AND exit_price IS NOT NULL AND exit_price != 0' }

    if (marketType) { sql += ` AND market_type = $${idx++}`; params.push(marketType) }
    if (direction) { sql += ` AND direction = $${idx++}`; params.push(direction) }

    if (search) {
      sql += ` AND (LOWER(symbol) LIKE $${idx} OR LOWER(strategy) LIKE $${idx} OR LOWER(notes) LIKE $${idx} OR LOWER(tags) LIKE $${idx})`
      params.push(`%${search.toLowerCase()}%`)
      idx++
    }

    const sortMap = { date: 'date', pnl: 'pnl', symbol: 'symbol', roi: 'roi' }
    const col = sortMap[sortBy] || 'date'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${col} ${order}`

    const p = parseInt(page) || 1
    const l = parseInt(limit) || 50
    sql += ` LIMIT $${idx++} OFFSET $${idx++}`
    params.push(l, (p - 1) * l)

    const { rows } = await getPool().query(sql, params)
    const countResult = await getPool().query(
      `SELECT COUNT(*) FROM trades WHERE 1=1 ${status === 'open' ? 'AND (exit_price IS NULL OR exit_price = 0)' : status === 'closed' ? 'AND exit_price IS NOT NULL AND exit_price != 0' : ''}`
    )
    return { trades: rows.map(toCamel), total: parseInt(countResult.rows[0].count) }
  }

  let filtered = [...jsonTrades]
  if (status === 'open') filtered = filtered.filter(t => t.exitPrice == null || t.exitPrice === 0)
  else if (status === 'closed') filtered = filtered.filter(t => t.exitPrice != null && t.exitPrice !== 0)
  if (marketType) filtered = filtered.filter(t => t.marketType === marketType)
  if (direction) filtered = filtered.filter(t => t.direction === direction)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(t =>
      t.symbol?.toLowerCase().includes(q) ||
      t.strategy?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q) ||
      (t.tags && t.tags.toLowerCase().includes(q))
    )
  }

  const validSorts = ['date', 'pnl', 'symbol', 'roi']
  if (sortBy && validSorts.includes(sortBy)) {
    const o = sortOrder === 'asc' ? 1 : -1
    filtered.sort((a, b) => { const va = a[sortBy] ?? ''; const vb = b[sortBy] ?? ''; return va > vb ? o : va < vb ? -o : 0 })
  } else {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const p = parseInt(page) || 1
  const l = parseInt(limit) || 50
  const total = filtered.length
  const start = (p - 1) * l
  return { trades: filtered.slice(start, start + l), total }
}

export async function getStats() {
  const all = await getAll()
  const trades = Array.isArray(all) ? all : (all.trades || [])

  const closed = trades.filter(t => t.exitPrice != null && t.exitPrice !== 0)
  const open = trades.filter(t => !t.exitPrice || t.exitPrice === 0)
  const winningTrades = closed.filter(t => t.pnl > 0)
  const losingTrades = closed.filter(t => t.pnl < 0)
  const winCount = winningTrades.length
  const lossCount = losingTrades.length
  const totalTrades = closed.length
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)

  const openPnl = open.reduce((s, t) => {
    if (t.currentPrice && t.entryPrice) {
      const diff = t.direction === 'long' ? (t.currentPrice - t.entryPrice) : (t.entryPrice - t.currentPrice)
      return s + (diff * t.quantity) - (t.fees || 0)
    }
    return s
  }, 0)

  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
  const avgWin = winCount > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winCount : 0
  const avgLoss = lossCount > 0 ? losingTrades.reduce((s, t) => s + t.pnl, 0) / lossCount : 0
  const profitFactor = lossCount > 0 ? Math.abs(winningTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.reduce((s, t) => s + t.pnl, 0)) : winCount > 0 ? Infinity : 0
  const bestTrade = closed.length > 0 ? closed.reduce((a, b) => (a.pnl || 0) > (b.pnl || 0) ? a : b) : null
  const worstTrade = closed.length > 0 ? closed.reduce((a, b) => (a.pnl || 0) < (b.pnl || 0) ? a : b) : null

  const monthly = {}
  const allSorted = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date))
  allSorted.forEach(t => {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthly[key]) monthly[key] = { month: key, pnl: 0, trades: 0, wins: 0 }
    monthly[key].pnl += t.pnl || 0
    monthly[key].trades++
    if (t.pnl > 0) monthly[key].wins++
  })

  const sortedMonths = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month))
  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0
  const equityCurve = sortedMonths.map(m => {
    cumulative += m.pnl
    if (cumulative > peak) peak = cumulative
    const dd = peak > 0 ? ((cumulative - peak) / peak) * 100 : 0
    if (dd < maxDrawdown) maxDrawdown = dd
    return { month: m.month, equity: Math.round(cumulative * 100) / 100 }
  })

  const sortedByDate = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date))
  let currentWinStreak = 0
  let currentLossStreak = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  for (const t of sortedByDate) {
    if (t.pnl >= 0) {
      currentWinStreak++; currentLossStreak = 0
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak
    } else {
      currentLossStreak++; currentWinStreak = 0
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak
    }
  }
  const currentStreak = currentWinStreak > 0 ? currentWinStreak : -currentLossStreak

  const strategyStats = {}
  closed.forEach(t => {
    if (!t.strategy) return
    if (!strategyStats[t.strategy]) strategyStats[t.strategy] = { trades: 0, wins: 0, pnl: 0 }
    strategyStats[t.strategy].trades++
    if (t.pnl > 0) strategyStats[t.strategy].wins++
    strategyStats[t.strategy].pnl += t.pnl || 0
  })

  return {
    totalTrades, openTrades: open.length, winCount, lossCount,
    totalPnl: Math.round(totalPnl * 100) / 100,
    openPnl: Math.round(openPnl * 100) / 100,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: profitFactor === Infinity ? Infinity : Math.round(profitFactor * 100) / 100,
    bestTrade, worstTrade,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    currentStreak, longestWinStreak, longestLossStreak,
    monthlyReturns: sortedMonths.map(m => ({ ...m, pnl: Math.round(m.pnl * 100) / 100 })),
    equityCurve,
    strategyStats: Object.entries(strategyStats).map(([strategy, data]) => ({
      strategy, ...data,
      winRate: Math.round((data.wins / data.trades) * 10000) / 100,
      pnl: Math.round(data.pnl * 100) / 100,
    })),
  }
}

// Init
if (!isPgEnabled()) loadJson()
