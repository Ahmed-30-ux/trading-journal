import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api.js'

function formatCurrency(n) {
  if (n == null) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : '+'
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

const marketTypes = ['', 'stock', 'forex', 'crypto', 'futures', 'options']
const directions = ['', 'long', 'short']
const statuses = ['', 'open', 'closed']

export default function TradeList() {
  const [trades, setTrades] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [marketType, setMarketType] = useState('')
  const [direction, setDirection] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [previewScreenshot, setPreviewScreenshot] = useState(null)
  const fileRef = useRef(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getTrades({ search, marketType, direction, status, sortBy, sortOrder, page, limit })
      setTrades(data.trades || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, marketType, direction, status, sortBy, sortOrder, page])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await api.deleteTrade(id)
      setTrades(prev => prev.filter(t => t.id !== id))
      setTotal(prev => prev - 1)
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(null)
    }
  }

  async function handleCsvImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)
    try {
      const data = await api.importCsv(file)
      alert(`Imported ${data.imported} trades successfully!`)
      load()
    } catch (err) {
      alert('Import failed: ' + err.message)
    } finally {
      setCsvImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function toggleSort(col) {
    if (sortBy === col) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortOrder('desc') }
  }

  function getRatingColor(r) {
    if (!r) return ''
    const colors = { A: 'text-[#22c55e]', B: 'text-[#6366f1]', C: 'text-[#eab308]', D: 'text-[#f97316]', F: 'text-[#ef4444]' }
    return colors[r] || ''
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">📋 Trade History</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{total} trade{total !== 1 ? 's' : ''} recorded ({trades.filter(t => !t.exitPrice).length} open)</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Search</label>
            <input type="text" placeholder="Search by symbol, strategy, tags..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Market</label>
            <select value={marketType} onChange={e => { setMarketType(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {marketTypes.filter(Boolean).map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Direction</label>
            <select value={direction} onChange={e => { setDirection(e.target.value); setPage(1) }}>
              <option value="">All</option>
              {directions.filter(Boolean).map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={load} className="btn-secondary text-sm h-[42px]">⟳</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fileRef.current?.click()} disabled={csvImporting} className="btn-secondary text-sm h-[42px] whitespace-nowrap">
            {csvImporting ? '...' : '📥 Import CSV'}
          </motion.button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => api.exportCsv()} className="btn-secondary text-sm h-[42px] whitespace-nowrap">📤 Export CSV</motion.button>
          <Link to="/add">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary text-sm h-[42px] whitespace-nowrap">+ New Trade</motion.button>
          </Link>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" /></div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <span className="text-4xl mb-4">📭</span>
            <p className="text-[var(--text-secondary)] text-sm mb-2">No trades found</p>
            <Link to="/add" className="btn-primary text-sm">Add Your First Trade</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {[
                    { key: 'date', label: 'Date' },
                    { key: null, label: 'Status' },
                    { key: 'symbol', label: 'Symbol' },
                    { key: null, label: 'Dir' },
                    { key: null, label: 'P&L' },
                    { key: null, label: 'ROI' },
                    { key: null, label: 'Rating' },
                    { key: null, label: 'Tags' },
                    { key: null, label: 'SS' },
                    { key: null, label: '' },
                  ].map(col => (
                    <th key={col.label}
                      className={`px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider text-left ${col.key ? 'cursor-pointer hover:text-[var(--text-secondary)] transition-colors' : ''}`}
                      onClick={() => col.key && toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.key === sortBy && <span className="text-[var(--color-accent)] text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {trades.map((trade, i) => (
                    <motion.tr key={trade.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                    >
                      <td className="px-4 py-3.5 text-[var(--text-secondary)] whitespace-nowrap">{new Date(trade.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        {!trade.exitPrice
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(99,102,241,0.1)] text-[#6366f1]">Open</span>
                          : <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.1)] text-[#22c55e]">Closed</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[var(--text-primary)]">{trade.symbol}</td>
                      <td className="px-4 py-3.5"><span className={`text-xs font-medium ${trade.direction === 'long' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{trade.direction === 'long' ? '▲' : '▼'}</span></td>
                      <td className={`px-4 py-3.5 font-semibold ${(trade.pnl || 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{formatCurrency(trade.pnl)}</td>
                      <td className={`px-4 py-3.5 text-xs font-medium ${(trade.roi || 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{trade.roi != null ? `${trade.roi >= 0 ? '+' : ''}${trade.roi.toFixed(2)}%` : '-'}</td>
                      <td className="px-4 py-3.5">
                        {trade.rating ? <span className={`font-bold text-lg ${getRatingColor(trade.rating)}`}>{trade.rating}</span> : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="px-4 py-3.5 max-w-[150px]">
                        <div className="flex flex-wrap gap-1">
                          {trade.tags ? trade.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] whitespace-nowrap">{tag}</span>
                          )) : <span className="text-[var(--text-muted)]">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {trade.screenshots ? (() => {
                          try {
                            const shots = JSON.parse(trade.screenshots)
                            return Array.isArray(shots) && shots.length > 0 ? (
                              <button onClick={() => setPreviewScreenshot(shots)} className="text-[var(--text-muted)] hover:text-[var(--color-accent)] transition-colors">
                                📷 <span className="text-[10px]">{shots.length}</span>
                              </button>
                            ) : <span className="text-[var(--text-muted)]">-</span>
                          } catch { return <span className="text-[var(--text-muted)]">-</span> }
                        })() : <span className="text-[var(--text-muted)]">-</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/edit/${trade.id}`} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">✏️</Link>
                          <button onClick={() => handleDelete(trade.id)} disabled={deleting === trade.id} className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[var(--text-muted)] hover:text-[#ef4444] transition-colors">
                            {deleting === trade.id ? '...' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {totalPages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2 disabled:opacity-30">← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-[var(--color-accent)] text-white' : 'btn-secondary'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2 disabled:opacity-30">Next →</button>
        </motion.div>
      )}

      {previewScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewScreenshot(null)}>
          <div className="relative max-w-3xl max-h-[90vh] mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewScreenshot(null)} className="absolute -top-10 right-0 text-white/60 hover:text-white text-sm transition-colors">Close ✕</button>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previewScreenshot.map((src, i) => (
                <img key={i} src={src} alt={`Screenshot ${i + 1}`} className="max-h-[80vh] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
