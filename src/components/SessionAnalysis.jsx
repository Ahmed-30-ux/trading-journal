import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api.js'

const SESSIONS = {
  asian: { label: 'Asian', start: 0, end: 8, icon: '🌏', color: 'var(--color-purple)', desc: 'Tokyo · Sydney · 00:00-08:00 UTC' },
  london: { label: 'London', start: 8, end: 16, icon: '🇬🇧', color: 'var(--color-gold)', desc: 'London · 08:00-16:00 UTC' },
  ny: { label: 'New York', start: 13, end: 22, icon: '🗽', color: 'var(--color-green)', desc: 'New York · 13:00-22:00 UTC' },
}

function getSession(hour) {
  if (hour >= 0 && hour < 8) return 'asian'
  if (hour >= 8 && hour < 16) return 'london'
  if (hour >= 13 && hour < 22) return 'ny'
  return 'asian'
}

export default function SessionAnalysis() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTrades().then(res => {
      setTrades(res.trades.filter(t => t.exitPrice != null))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const sessionData = useMemo(() => {
    const data = { asian: { trades: 0, wins: 0, losses: 0, pnl: 0 }, london: { trades: 0, wins: 0, losses: 0, pnl: 0 }, ny: { trades: 0, wins: 0, losses: 0, pnl: 0 } }
    let maxPnl = 0

    trades.forEach(t => {
      const hour = new Date(t.date).getUTCHours()
      const session = getSession(hour)
      data[session].trades++
      if (t.pnl >= 0) data[session].wins++
      else data[session].losses++
      data[session].pnl += t.pnl || 0
    })

    Object.values(data).forEach(s => {
      s.winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0
      if (Math.abs(s.pnl) > maxPnl) maxPnl = Math.abs(s.pnl)
    })

    return { data, maxPnl }
  }, [trades])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasData = Object.values(sessionData.data).some(s => s.trades > 0)

  if (!hasData) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Session Analysis</h3>
        <p className="text-[var(--text-muted)] text-sm">Close some trades to see session breakdown</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Session Analysis</h3>
      <p className="text-xs text-[var(--text-muted)] mb-5">Performance breakdown by trading session</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(SESSIONS).map(([key, session]) => {
          const s = sessionData.data[key]
          const barWidth = sessionData.maxPnl > 0 ? (Math.abs(s.pnl) / sessionData.maxPnl) * 100 : 0
          return (
            <motion.div key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Object.keys(SESSIONS).indexOf(key) * 0.1 }}
              className="rounded-xl p-5 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-colors"
              style={{ background: `linear-gradient(135deg, ${session.color}08, transparent)` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{session.icon}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.winRate >= 50 ? 'bg-[var(--color-green-bg)] text-[var(--color-green)]' : 'bg-[var(--color-red-bg)] text-[var(--color-red)]'}`}>
                  {s.winRate.toFixed(0)}%
                </span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{session.label}</p>
              <p className="text-xs text-[var(--text-muted)] mb-2">{session.desc}</p>
              <div className="mb-2">
                <div className="h-2 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${session.color}88, ${session.color})` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{s.trades} trades</span>
                <span className={`text-sm font-bold ${s.pnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                  {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
                <span>{s.wins}W</span>
                <span>·</span>
                <span>{s.losses}L</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
