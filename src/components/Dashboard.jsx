import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api.js'

function formatCurrency(n) {
  if (n == null) return '-'
  const abs = Math.abs(n)
  const s = n < 0 ? '-' : ''
  if (abs >= 1000000) return `${s}$${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `${s}$${(abs / 1000).toFixed(1)}K`
  return `${s}$${abs.toFixed(2)}`
}

function AnimatedNumber({ value, decimals = 2, isCurrency = false, isPercent = false }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    prev.current = display
    const start = display
    const end = value
    const duration = 800
    const startTime = performance.now()
    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  if (isCurrency) return <span>{formatCurrency(display)}</span>
  return <span>{display.toFixed(decimals)}{isPercent ? '%' : ''}</span>
}

function StatCard({ title, value, subtitle, isProfit, isCurrency, decimals, icon, delay = 0, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[rgba(99,102,241,0.02)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl">{icon}</span>
          {isProfit && value != null && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${value >= 0 ? 'bg-[var(--color-green-bg, rgba(34,197,94,0.1))] text-[var(--color-green,#22c55e)]' : 'bg-[var(--color-red-bg, rgba(239,68,68,0.1))] text-[var(--color-red,#ef4444)]'}`}>
              {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">{title}</p>
        <p className={`text-2xl font-bold tracking-tight ${color || 'text-[var(--text-primary)]'}`}>
          <AnimatedNumber value={value || 0} decimals={decimals} isCurrency={isCurrency} />
        </p>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  )
}

function MiniChart({ data }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data.map(d => d.equity), 1)
  const min = Math.min(...data.map(d => d.equity), 0)
  const range = max - min || 1
  const w = 100
  const h = 40
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((d.equity - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  const isUp = data[data.length - 1]?.equity >= data[0]?.equity
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentTrades, setRecentTrades] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([
        api.getStats(),
        api.getTrades({ limit: 5 }),
      ])
      setStats(s)
      setRecentTrades(t.trades || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">Loading your portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Dashboard</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Your trading performance at a glance</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={load} className="btn-secondary text-sm">⟳</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => window.open('/api/trades/export/csv')} className="btn-secondary text-sm flex items-center gap-1.5">📥 CSV</motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total P&L" value={stats?.totalPnl} isProfit isCurrency icon="💰" subtitle={`${stats?.totalTrades || 0} closed trades`} delay={0} color={stats?.totalPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatCard title="Win Rate" value={stats?.winRate} isProfit decimals={1} icon="🎯" subtitle={`${stats?.winCount || 0} wins / ${stats?.lossCount || 0} losses`} delay={0.1} color={stats?.winRate >= 50 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatCard title="Open Positions" value={stats?.openTrades || 0} decimals={0} icon="📈" subtitle={stats?.openPnl != null && stats.openPnl !== 0 ? `Unrealized: ${formatCurrency(stats.openPnl)}` : 'No open positions'} delay={0.2} color={stats?.openPnl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatCard title="Profit Factor" value={stats?.profitFactor} isProfit decimals={2} icon="⚡" subtitle={stats?.profitFactor === Infinity ? 'Perfect (no losses)' : 'Gross win/loss'} delay={0.3} color={stats?.profitFactor >= 1.5 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Max Drawdown" value={stats?.maxDrawdown || 0} decimals={2} icon="📉" subtitle="Peak-to-trough decline" delay={0.35} color="text-[#ef4444]" />
        <StatCard title="Current Streak" value={stats?.currentStreak || 0} decimals={0} icon="🔥" subtitle={stats?.currentStreak > 0 ? 'Winning' : stats?.currentStreak < 0 ? 'Losing' : 'No streak'} delay={0.4} color={stats?.currentStreak > 0 ? 'text-[#22c55e]' : stats?.currentStreak < 0 ? 'text-[#ef4444]' : ''} />
        <StatCard title="Best Win Streak" value={stats?.longestWinStreak || 0} decimals={0} icon="🏆" subtitle="Consecutive wins" delay={0.45} color="text-[#22c55e]" />
        <StatCard title="Worst Loss Streak" value={stats?.longestLossStreak || 0} decimals={0} icon="💀" subtitle="Consecutive losses" delay={0.5} color="text-[#ef4444]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }} className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Equity Curve</h3>
            <span className="text-xs text-[var(--text-muted)]">Cumulative P&L</span>
          </div>
          {stats?.equityCurve && stats.equityCurve.length > 1 ? (
            <MiniChart data={stats.equityCurve} />
          ) : (
            <div className="flex items-center justify-center h-12"><p className="text-[var(--text-muted)] text-sm">Add more trades to see your equity curve</p></div>
          )}
          {stats?.bestTrade && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-[rgba(34,197,94,0.1)] rounded-xl p-4">
                <p className="text-xs text-[#22c55e] mb-1">🏆 Best Trade</p>
                <p className="text-lg font-bold text-[#22c55e]">{formatCurrency(stats.bestTrade.pnl)}</p>
                <p className="text-xs text-[var(--text-muted)]">{stats.bestTrade.symbol} · {new Date(stats.bestTrade.date).toLocaleDateString()}</p>
              </div>
              <div className="bg-[rgba(239,68,68,0.1)] rounded-xl p-4">
                <p className="text-xs text-[#ef4444] mb-1">⚠️ Worst Trade</p>
                <p className="text-lg font-bold text-[#ef4444]">{formatCurrency(stats.worstTrade?.pnl || 0)}</p>
                <p className="text-xs text-[var(--text-muted)]">{stats.worstTrade?.symbol} · {stats.worstTrade ? new Date(stats.worstTrade.date).toLocaleDateString() : ''}</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Trades</h3>
          {recentTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <span className="text-3xl mb-3">📝</span>
              <p className="text-[var(--text-muted)] text-sm">No trades yet</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">Start by adding your first trade</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((trade, i) => {
                const isOpen = !trade.exitPrice
                return (
                  <motion.div key={trade.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.65 + i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{trade.symbol} {isOpen && <span className="text-xs text-[var(--color-accent)] ml-1">●</span>}</p>
                      <p className="text-xs text-[var(--text-muted)]">{new Date(trade.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-semibold ${(trade.pnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{formatCurrency(trade.pnl || 0)}</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
