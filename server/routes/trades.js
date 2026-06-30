import { Router } from 'express'
import multer from 'multer'
import Papa from 'papaparse'
import * as db from '../db.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

function calcPnl(trade) {
  if (trade.exitPrice == null || !trade.entryPrice || !trade.quantity) return 0
  const diff = trade.direction === 'long'
    ? (trade.exitPrice - trade.entryPrice)
    : (trade.entryPrice - trade.exitPrice)
  return (diff * trade.quantity) - (trade.fees || 0)
}

function calcRoi(trade) {
  if (!trade.entryPrice || !trade.quantity || trade.entryPrice === 0) return 0
  const investment = trade.entryPrice * trade.quantity
  if (investment === 0) return 0
  return ((trade.pnl || 0) / investment) * 100
}

router.get('/', async (req, res) => {
  try {
    const { search, sortBy, sortOrder, marketType, direction, status, page, limit } = req.query
    const result = await db.query({ search, sortBy, sortOrder, marketType, direction, status, page, limit })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/export/csv', async (req, res) => {
  try {
    const trades = await db.getAll()
    const rows = Array.isArray(trades) ? trades : (trades.trades || [])
    const csv = Papa.unparse(rows.map(t => ({
      date: t.date,
      symbol: t.symbol,
      marketType: t.marketType,
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice ?? '',
      quantity: t.quantity,
      fees: t.fees || 0,
      pnl: t.pnl ?? '',
      roi: t.roi ?? '',
      strategy: t.strategy || '',
      emotion: t.emotion || '',
      rating: t.rating || '',
      tags: t.tags || '',
      notes: t.notes || '',
    })))
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"')
    res.send(csv)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const csv = req.file.buffer.toString('utf-8')
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    if (parsed.errors.length) return res.status(400).json({ error: 'CSV parse error', details: parsed.errors[0] })

    const created = []
    for (const row of parsed.data) {
      if (!row.symbol) continue
      const trade = {
        date: row.date || new Date().toISOString().split('T')[0],
        symbol: (row.symbol || '').toUpperCase(),
        marketType: row.marketType || 'stock',
        direction: row.direction || 'long',
        entryPrice: parseFloat(row.entryPrice) || 0,
        exitPrice: row.exitPrice != null && row.exitPrice !== '' ? parseFloat(row.exitPrice) : null,
        quantity: parseFloat(row.quantity) || 0,
        fees: parseFloat(row.fees) || 0,
        stopLoss: row.stopLoss != null && row.stopLoss !== '' ? parseFloat(row.stopLoss) : null,
        takeProfit: row.takeProfit != null && row.takeProfit !== '' ? parseFloat(row.takeProfit) : null,
        strategy: row.strategy || '',
        emotion: row.emotion || '',
        rating: row.rating || '',
        tags: row.tags || '',
        notes: row.notes || '',
      }
      trade.pnl = calcPnl(trade)
      trade.roi = calcRoi(trade)
      created.push(trade)
    }

    if (created.length === 0) return res.status(400).json({ error: 'No valid trades found in CSV' })
    const result = await db.bulkCreate(created)
    res.status(201).json({ imported: result.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await db.getStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const trade = await db.getById(parseInt(req.params.id))
    if (!trade) return res.status(404).json({ error: 'Trade not found' })
    res.json(trade)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    const { date, symbol, marketType, direction, entryPrice, exitPrice, quantity, fees, strategy, emotion, notes, rating, tags, checklist, currentPrice } = req.body
    if (!date || !symbol || !marketType || !direction || entryPrice == null || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: date, symbol, marketType, direction, entryPrice, quantity' })
    }
    const trade = {
      date,
      symbol: symbol.toUpperCase(),
      marketType,
      direction,
      entryPrice: parseFloat(entryPrice),
      exitPrice: exitPrice != null && exitPrice !== '' ? parseFloat(exitPrice) : null,
      quantity: parseFloat(quantity),
      stopLoss: req.body.stopLoss != null && req.body.stopLoss !== '' ? parseFloat(req.body.stopLoss) : null,
      takeProfit: req.body.takeProfit != null && req.body.takeProfit !== '' ? parseFloat(req.body.takeProfit) : null,
      fees: fees ? parseFloat(fees) : 0,
      strategy: strategy || '',
      emotion: emotion || '',
      notes: notes || '',
      rating: rating || '',
      tags: tags || '',
      checklist: checklist || '',
      currentPrice: currentPrice != null && currentPrice !== '' ? parseFloat(currentPrice) : null,
    }
    trade.pnl = calcPnl(trade)
    trade.roi = calcRoi(trade)
    const created = await db.create(trade)
    res.status(201).json(created)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await db.getById(id)
    if (!existing) return res.status(404).json({ error: 'Trade not found' })

    const updates = {}
    const fields = ['date', 'symbol', 'marketType', 'direction', 'entryPrice', 'exitPrice', 'quantity', 'stopLoss', 'takeProfit', 'fees', 'strategy', 'emotion', 'notes', 'rating', 'tags', 'checklist', 'currentPrice']
    fields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f]
    })
    if (updates.symbol) updates.symbol = updates.symbol.toUpperCase()
    if (updates.entryPrice != null) updates.entryPrice = parseFloat(updates.entryPrice)
    if (updates.exitPrice != null) updates.exitPrice = parseFloat(updates.exitPrice)
    if (updates.quantity != null) updates.quantity = parseFloat(updates.quantity)
    if (updates.fees != null) updates.fees = parseFloat(updates.fees)
    if (updates.currentPrice != null) updates.currentPrice = parseFloat(updates.currentPrice)

    const merged = { ...existing, ...updates }
    merged.pnl = calcPnl(merged)
    merged.roi = calcRoi(merged)
    updates.pnl = merged.pnl
    updates.roi = merged.roi

    const updated = await db.update(id, updates)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const ok = await db.remove(parseInt(req.params.id))
    if (!ok) return res.status(404).json({ error: 'Trade not found' })
    res.status(204).end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
