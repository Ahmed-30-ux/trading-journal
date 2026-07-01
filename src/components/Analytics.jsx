import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { api } from '../api.js'
import CalendarHeatmap from './CalendarHeatmap.jsx'
import SessionAnalysis from './SessionAnalysis.jsx'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

function formatCurrency(n) {
  if (n == null) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function chartTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    text: isDark ? '#8b949e' : '#6b7280',
    grid: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#14171e' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
  }
}

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    api.getStats().then(s => setStats(s)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const reRender = useCallback(() => forceUpdate(n => n + 1), [])

  useEffect(() => {
    const observer = new MutationObserver(() => reRender())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.addEventListener('resize', reRender)
    return () => { observer.disconnect(); window.removeEventListener('resize', reRender) }
  }, [reRender])

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" /></div>
  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Data Yet</h2>
        <p className="text-[var(--text-muted)] text-sm">Add some trades to see your analytics</p>
      </div>
    )
  }

  const th = chartTheme()
  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: th.text, font: { size: 11 } } },
      tooltip: {
        backgroundColor: th.tooltipBg,
        titleColor: document.documentElement.getAttribute('data-theme') !== 'light' ? '#e1e4e8' : '#1f2937',
        bodyColor: th.text,
        borderColor: th.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
  }

  const monthlyLabels = stats.monthlyReturns?.map(m => m.month) || []
  const monthlyPnl = stats.monthlyReturns?.map(m => m.pnl) || []
  const monthlyColors = monthlyPnl.map(v => v >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)')

  const equityLabels = stats.equityCurve?.map(e => e.month) || []
  const equityData = stats.equityCurve?.map(e => e.equity) || []

  const winLossData = {
    labels: ['Wins', 'Losses'],
    datasets: [{
      data: [stats.winCount || 0, stats.lossCount || 0],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
    }],
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">◈ Analytics</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Deep dive into your trading performance</p>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => window.print()}
          className="btn-secondary text-sm flex items-center gap-1.5 no-print"
        >🖨️ Print Report</motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Monthly Returns</h3>
          <div className="h-72">
            <Bar data={{
              labels: monthlyLabels,
              datasets: [{ label: 'P&L', data: monthlyPnl, backgroundColor: monthlyColors, borderRadius: 4, borderSkipped: false }],
            }} options={{
              ...chartOpts, scales: {
                x: { ticks: { color: th.text }, grid: { color: th.grid } },
                y: { ticks: { color: th.text, callback: v => '$' + v }, grid: { color: th.grid } },
              },
            }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Equity Curve</h3>
          <div className="h-72">
            <Line data={{
              labels: equityLabels,
              datasets: [{
                label: 'Equity', data: equityData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#10b981',
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.3,
                fill: true,
              }],
            }} options={{
              ...chartOpts, scales: {
                x: { ticks: { color: th.text }, grid: { color: th.grid } },
                y: { ticks: { color: th.text, callback: v => '$' + v }, grid: { color: th.grid } },
              },
            }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Win / Loss Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-64">
              <Pie data={winLossData} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { position: 'bottom', labels: { color: th.text, padding: 16, font: { size: 12 } } } } }} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Drawdown Analysis</h3>
          <div className="h-64">
            <Line data={{
              labels: equityLabels,
              datasets: [{
                label: 'Equity',
                data: equityData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                pointRadius: 2,
                tension: 0.3,
                fill: true,
              }, {
                label: 'Drawdown',
                data: equityData.map((e, i) => {
                  const peak = Math.max(...equityData.slice(0, i + 1))
                  return peak > 0 ? ((e - peak) / peak) * 100 : 0
                }),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                pointRadius: 0,
                tension: 0.3,
                fill: true,
                yAxisID: 'y1',
              }],
            }} options={{
              ...chartOpts,
              scales: {
                x: { ticks: { color: th.text }, grid: { color: th.grid } },
                y: { position: 'left', ticks: { color: th.text, callback: v => '$' + v }, grid: { color: th.grid } },
                y1: { position: 'right', ticks: { color: '#ef4444', callback: v => v.toFixed(1) + '%' }, grid: { display: false } },
              },
            }} />
          </div>
          <div className="mt-4 p-3 rounded-xl bg-[var(--color-red-bg)]">
            <p className="text-sm text-[var(--text-secondary)]">Max Drawdown: <span className="font-bold text-[var(--color-red)]">{stats.maxDrawdown}%</span></p>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <CalendarHeatmap />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <SessionAnalysis />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Trades', value: stats.totalTrades, color: 'text-[var(--text-primary)]' },
            { label: 'Open Positions', value: stats.openTrades, color: 'text-[var(--color-purple)]' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]' },
            { label: 'Profit Factor', value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1.5 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]' },
            { label: 'Total P&L', value: formatCurrency(stats.totalPnl), color: stats.totalPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]' },
            { label: 'Max Drawdown', value: `${stats.maxDrawdown}%`, color: 'text-[var(--color-red)]' },
            { label: 'Best Streak', value: `${stats.longestWinStreak} wins`, color: 'text-[var(--color-green)]' },
            { label: 'Worst Streak', value: `${stats.longestLossStreak} losses`, color: 'text-[var(--color-red)]' },
          ].map((m, i) => (
            <div key={m.label} className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)]">
              <p className="text-xs text-[var(--text-muted)] mb-1">{m.label}</p>
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Strategy Performance</h3>
        {stats.strategyStats?.length > 0 ? (
          <div className="space-y-3">
            {stats.strategyStats.map((s, i) => (
              <motion.div key={s.strategy} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{s.strategy}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.trades} trades · {s.winRate}% win rate</p>
                </div>
                <span className={`text-sm font-bold ${s.pnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>{formatCurrency(s.pnl)}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">No strategy data</p>
        )}
      </motion.div>

      <div className="print-only">
        <h2 className="text-xl font-bold mb-4">TradeJournal Pro Report</h2>
        <p>Generated: {new Date().toLocaleDateString()}</p>
        <p>Total P&L: {formatCurrency(stats.totalPnl)} | Win Rate: {stats.winRate}%</p>
        <p>Total Trades: {stats.totalTrades} | Open: {stats.openTrades}</p>
        <p>Max Drawdown: {stats.maxDrawdown}% | Best Streak: {stats.longestWinStreak} | Worst Streak: {stats.longestLossStreak}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Month</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>P&L</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Trades</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {stats.monthlyReturns?.map(m => (
              <tr key={m.month} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '6px 8px' }}>{m.month}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: m.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(m.pnl)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.trades}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.trades > 0 ? ((m.wins / m.trades) * 100).toFixed(1) + '%' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
