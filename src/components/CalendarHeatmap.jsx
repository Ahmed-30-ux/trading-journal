import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api.js'

function getDailyPnl(trades) {
  const daily = {}
  trades.forEach(t => {
    if (t.exitPrice == null) return
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!daily[key]) daily[key] = { date: key, pnl: 0, trades: 0, wins: 0, losses: 0 }
    daily[key].pnl += t.pnl || 0
    daily[key].trades++
    if (t.pnl >= 0) daily[key].wins++
    else daily[key].losses++
  })
  return daily
}

function getWeekRows(year, month, dailyMap) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const weeks = []
  let currentWeek = []
  const startDow = firstDay.getDay()
  for (let i = 0; i < startDow; i++) currentWeek.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    currentWeek.push({ day: d, key, data: dailyMap[key] || null })
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

function getColor(pnl) {
  if (pnl == null) return 'bg-[rgba(255,255,255,0.02)]'
  if (pnl > 200) return 'bg-[var(--color-green)]'
  if (pnl > 50) return 'bg-[rgba(34,197,94,0.6)]'
  if (pnl > 0) return 'bg-[rgba(34,197,94,0.25)]'
  if (pnl === 0) return 'bg-[rgba(255,255,255,0.04)]'
  if (pnl > -50) return 'bg-[rgba(239,68,68,0.25)]'
  if (pnl > -200) return 'bg-[rgba(239,68,68,0.6)]'
  return 'bg-[var(--color-red)]'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarHeatmap() {
  const [dailyMap, setDailyMap] = useState({})
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    api.getTrades().then(res => {
      const daily = getDailyPnl(res.trades)
      setDailyMap(daily)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const weeks = useMemo(() => getWeekRows(year, month, dailyMap), [year, month, dailyMap])
  const monthLabel = `${MONTHS[month]} ${year}`

  const totalPnl = useMemo(() => {
    return Object.values(dailyMap).reduce((s, d) => s + d.pnl, 0)
  }, [dailyMap])

  const today = new Date()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-6" style={{ position: 'relative' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Calendar Heatmap</h3>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }}>◀</motion.button>
          <span className="text-sm font-medium text-[var(--text-primary)] min-w-[80px] text-center">{monthLabel}</span>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }}>▶</motion.button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              {DAYS.map(d => <th key={d} className="text-[var(--text-muted)] text-[10px] font-normal pb-2 text-center" style={{ width: 28 }}>{d[0]}</th>)}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                <td className="text-[var(--text-muted)] text-[10px] pr-1 text-right align-middle">{week.find(d => d) ? '' : ''}</td>
                {week.map((cell, di) => (
                  <td key={di} className="p-0.5">
                    {cell ? (
                      <div
                        className={`w-7 h-7 rounded-md ${getColor(cell.data?.pnl)} hover:scale-110 transition-transform cursor-pointer flex items-center justify-center relative`}
                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, data: cell.data, day: cell.day })}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => {
                          if (cell.data) {
                            const detail = `Date: ${cell.key}\nP&L: $${cell.data.pnl.toFixed(2)}\nTrades: ${cell.data.trades}\nWins: ${cell.data.wins}\nLosses: ${cell.data.losses}`
                            alert(detail)
                          }
                        }}
                      >
                        <span className={`text-[8px] font-medium ${cell.data?.pnl > 0 ? 'text-white' : cell.data?.pnl < 0 ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                          {cell.day}
                        </span>
                      </div>
                    ) : (
                      <div className="w-7 h-7" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Less</span>
          <div className="w-3 h-3 rounded bg-[rgba(255,255,255,0.02)]" />
          <div className="w-3 h-3 rounded bg-[rgba(34,197,94,0.25)]" />
          <div className="w-3 h-3 rounded bg-[rgba(34,197,94,0.6)]" />
          <div className="w-3 h-3 rounded bg-[var(--color-green)]" />
          <span className="text-xs text-[var(--text-muted)]">More</span>
        </div>
        <span className={`text-sm font-semibold ${totalPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
          {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
        </span>
      </div>

      {tooltip && (
        <div className="fixed z-50 pointer-events-none bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-2xl text-xs" style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          {tooltip.data ? (
            <>
              <p className="font-medium text-[var(--text-primary)] mb-1">{tooltip.data.date}</p>
              <p className={tooltip.data.pnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}>P&L: ${tooltip.data.pnl.toFixed(2)}</p>
              <p className="text-[var(--text-muted)]">Trades: {tooltip.data.trades} ({tooltip.data.wins}W / {tooltip.data.losses}L)</p>
            </>
          ) : (
            <p className="text-[var(--text-muted)]">No trades</p>
          )}
        </div>
      )}
    </div>
  )
}
