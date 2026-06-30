import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import tradesRouter from './routes/trades.js'
import * as db from './db.js'
import { runMigration } from './migrate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/trades', tradesRouter)

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

if (process.env.VERCEL !== '1') {
  const distPath = path.join(__dirname, '..', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  } else {
    console.log('Dev mode: frontend served by Vite on port 5173')
  }
}

if (process.env.DATABASE_URL) {
  app.use(async (req, res, next) => {
    if (!app.locals.migrated) {
      try { await runMigration() }
      catch (e) { console.error('Migration failed:', e.message) }
      app.locals.migrated = true
    }
    next()
  })
}

export default app

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`TradeJournal server running on http://localhost:${PORT}`))
}
