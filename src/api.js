const STORAGE_KEY = 'tradejournal_trades'
const DATA_VERSION = 2
let trades = []
let nextId = 1

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, trades, nextId }))
  } catch (e) {
    console.error('Failed to save trades:', e)
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object' && data.version === DATA_VERSION) {
      trades = Array.isArray(data.trades) ? data.trades : []
      nextId = typeof data.nextId === 'number' ? data.nextId : 1
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (e) {
    console.warn('Failed to load trades, starting fresh:', e.message)
    trades = []
    nextId = 1
  }
}

function calcPnl(direction, entry, exit, quantity, fees) {
  if (exit == null || !entry || !quantity) return 0
  const diff = direction === 'long' ? (exit - entry) : (entry - exit)
  return (diff * quantity) - (fees || 0)
}

function calcRoi(pnl, entry, quantity) {
  if (!entry || !quantity || entry === 0) return 0
  return (pnl / (entry * quantity)) * 100
}

function getStats() {
  const all = trades
  const closed = all.filter(t => t.exitPrice != null && t.exitPrice !== 0)
  const open = all.filter(t => !t.exitPrice || t.exitPrice === 0)
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

load()

export const api = {
  getTrades(params = {}) {
    let filtered = [...trades]

    if (params.status === 'open') filtered = filtered.filter(t => t.exitPrice == null || t.exitPrice === 0)
    else if (params.status === 'closed') filtered = filtered.filter(t => t.exitPrice != null && t.exitPrice !== 0)

    if (params.marketType) filtered = filtered.filter(t => t.marketType === params.marketType)
    if (params.direction) filtered = filtered.filter(t => t.direction === params.direction)

    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(t =>
        t.symbol?.toLowerCase().includes(q) ||
        t.strategy?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        (t.tags && t.tags.toLowerCase().includes(q))
      )
    }

    const validSorts = ['date', 'pnl', 'symbol', 'roi']
    if (params.sortBy && validSorts.includes(params.sortBy)) {
      const o = params.sortOrder === 'asc' ? 1 : -1
      filtered.sort((a, b) => {
        const va = a[params.sortBy] ?? ''
        const vb = b[params.sortBy] ?? ''
        return va > vb ? o : va < vb ? -o : 0
      })
    } else {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    }

    const p = parseInt(params.page) || 1
    const l = parseInt(params.limit) || 50
    const total = filtered.length
    const start = (p - 1) * l
    return Promise.resolve({ trades: filtered.slice(start, start + l), total })
  },

  getTrade(id) {
    const trade = trades.find(t => t.id === id) || null
    return Promise.resolve(trade)
  },

  createTrade(data) {
    const entry = {
      id: nextId++,
      ...data,
      pnl: 0,
      roi: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (data.exitPrice) {
      entry.pnl = Math.round(calcPnl(data.direction, data.entryPrice, data.exitPrice, data.quantity, data.fees) * 100) / 100
      entry.roi = Math.round(calcRoi(entry.pnl, data.entryPrice, data.quantity) * 100) / 100
    }
    trades.unshift(entry)
    save()
    return Promise.resolve(entry)
  },

  updateTrade(id, data) {
    const idx = trades.findIndex(t => t.id === id)
    if (idx === -1) return Promise.reject(new Error('Trade not found'))
    const updated = {
      ...trades[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    if (data.exitPrice) {
      updated.pnl = Math.round(calcPnl(data.direction, data.entryPrice, data.exitPrice, data.quantity, data.fees) * 100) / 100
      updated.roi = Math.round(calcRoi(updated.pnl, data.entryPrice, data.quantity) * 100) / 100
    } else {
      updated.pnl = 0
      updated.roi = 0
    }
    trades[idx] = updated
    save()
    return Promise.resolve(updated)
  },

  deleteTrade(id) {
    trades = trades.filter(t => t.id !== id)
    save()
    return Promise.resolve(null)
  },

  getStats() {
    return Promise.resolve(getStats())
  },

  exportCsv() {
    const headers = ['date', 'symbol', 'marketType', 'direction', 'entryPrice', 'exitPrice', 'quantity', 'stopLoss', 'takeProfit', 'fees', 'strategy', 'emotion', 'rating', 'tags', 'notes', 'pnl', 'roi']
    const rows = trades.map(t => headers.map(h => t[h] ?? '').join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  importCsv(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length < 2) return reject(new Error('CSV is empty'))

          const headers = lines[0].split(',')
          let imported = 0
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',')
            const raw = {}
            headers.forEach((h, j) => { raw[h.trim()] = vals[j]?.trim() })
            const entryPrice = parseFloat(raw.entryPrice)
            const quantity = parseFloat(raw.quantity)
            if (isNaN(entryPrice) || isNaN(quantity)) continue

            const exitPrice = raw.exitPrice ? parseFloat(raw.exitPrice) : null
            const fees = parseFloat(raw.fees) || 0
            const direction = raw.direction || 'long'
            const pnl = exitPrice ? calcPnl(direction, entryPrice, exitPrice, quantity, fees) : 0

            trades.push({
              id: nextId++,
              date: raw.date || new Date().toISOString().split('T')[0],
              symbol: raw.symbol || 'UNKNOWN',
              marketType: raw.marketType || 'stock',
              direction,
              entryPrice,
              exitPrice,
              quantity,
              stopLoss: raw.stopLoss ? parseFloat(raw.stopLoss) : null,
              takeProfit: raw.takeProfit ? parseFloat(raw.takeProfit) : null,
              fees,
              strategy: raw.strategy || '',
              emotion: raw.emotion || '',
              rating: raw.rating || '',
              tags: raw.tags || '',
              notes: raw.notes || '',
              currentPrice: null,
              checklist: raw.checklist || '',
              pnl: Math.round(pnl * 100) / 100,
              roi: exitPrice ? Math.round(calcRoi(pnl, entryPrice, quantity) * 100) / 100 : 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            imported++
          }
          save()
          resolve({ imported })
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  },
}
