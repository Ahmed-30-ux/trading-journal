import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api.js'

const marketTypes = ['stock', 'forex', 'crypto', 'futures', 'options']
const emotions = ['', 'confident', 'anxious', 'neutral', 'euphoric', 'frustrated', 'fearful', 'greedy', 'disciplined']
const strategies = ['', 'breakout', 'scalping', 'swing', 'momentum', 'reversal', 'grid', 'dca', 'day trading', 'position']
const ratings = ['', 'A', 'B', 'C', 'D', 'F']

function calcPnl(direction, entry, exit, quantity, fees) {
  if (!exit || !entry || !quantity) return 0
  const diff = direction === 'long' ? (exit - entry) : (entry - exit)
  return (diff * quantity) - (fees || 0)
}

function calcRoi(pnl, entry, quantity) {
  if (!entry || !quantity || entry === 0) return 0
  return (pnl / (entry * quantity)) * 100
}

export default function TradeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    marketType: 'stock',
    direction: 'long',
    entryPrice: '',
    exitPrice: '',
    margin: '',
    leverage: '1',
    stopLoss: '',
    takeProfit: '',
    fees: '0',
    strategy: '',
    emotion: '',
    rating: '',
    tags: '',
    notes: '',
    currentPrice: '',
    checklist: '',
  })

  const ALL_SYMBOLS = [
    { symbol: 'AAPL', type: 'stock', label: 'Apple Inc.' },
    { symbol: 'TSLA', type: 'stock', label: 'Tesla Inc.' },
    { symbol: 'AMZN', type: 'stock', label: 'Amazon.com Inc.' },
    { symbol: 'MSFT', type: 'stock', label: 'Microsoft Corp.' },
    { symbol: 'GOOGL', type: 'stock', label: 'Alphabet Inc.' },
    { symbol: 'META', type: 'stock', label: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', type: 'stock', label: 'NVIDIA Corp.' },
    { symbol: 'AMD', type: 'stock', label: 'Advanced Micro Devices' },
    { symbol: 'NFLX', type: 'stock', label: 'Netflix Inc.' },
    { symbol: 'DIS', type: 'stock', label: 'Walt Disney Co.' },
    { symbol: 'SPY', type: 'stock', label: 'SPDR S&P 500 ETF' },
    { symbol: 'QQQ', type: 'stock', label: 'Invesco QQQ Trust' },
    { symbol: 'VTI', type: 'stock', label: 'Vanguard Total Stock Market' },
    { symbol: 'IWM', type: 'stock', label: 'Russell 2000 ETF' },
    { symbol: 'TSM', type: 'stock', label: 'Taiwan Semiconductor' },
    { symbol: 'JPM', type: 'stock', label: 'JPMorgan Chase & Co.' },
    { symbol: 'V', type: 'stock', label: 'Visa Inc.' },
    { symbol: 'WMT', type: 'stock', label: 'Walmart Inc.' },
    { symbol: 'JNJ', type: 'stock', label: 'Johnson & Johnson' },
    { symbol: 'PG', type: 'stock', label: 'Procter & Gamble Co.' },
    { symbol: 'MA', type: 'stock', label: 'Mastercard Inc.' },
    { symbol: 'UNH', type: 'stock', label: 'UnitedHealth Group Inc.' },
    { symbol: 'HD', type: 'stock', label: 'The Home Depot Inc.' },
    { symbol: 'BAC', type: 'stock', label: 'Bank of America Corp.' },
    { symbol: 'XOM', type: 'stock', label: 'Exxon Mobil Corp.' },
    { symbol: 'COIN', type: 'stock', label: 'Coinbase Global Inc.' },
    { symbol: 'PLTR', type: 'stock', label: 'Palantir Technologies Inc.' },
    { symbol: 'RIVN', type: 'stock', label: 'Rivian Automotive Inc.' },
    { symbol: 'SNAP', type: 'stock', label: 'Snap Inc.' },
    { symbol: 'UBER', type: 'stock', label: 'Uber Technologies Inc.' },
    { symbol: 'BTC/USD', type: 'crypto', label: 'Bitcoin / US Dollar' },
    { symbol: 'ETH/USD', type: 'crypto', label: 'Ethereum / US Dollar' },
    { symbol: 'SOL/USD', type: 'crypto', label: 'Solana / US Dollar' },
    { symbol: 'XRP/USD', type: 'crypto', label: 'Ripple / US Dollar' },
    { symbol: 'DOGE/USD', type: 'crypto', label: 'Dogecoin / US Dollar' },
    { symbol: 'ADA/USD', type: 'crypto', label: 'Cardano / US Dollar' },
    { symbol: 'DOT/USD', type: 'crypto', label: 'Polkadot / US Dollar' },
    { symbol: 'AVAX/USD', type: 'crypto', label: 'Avalanche / US Dollar' },
    { symbol: 'MATIC/USD', type: 'crypto', label: 'Polygon / US Dollar' },
    { symbol: 'LINK/USD', type: 'crypto', label: 'Chainlink / US Dollar' },
    { symbol: 'EURUSD', type: 'forex', label: 'Euro / US Dollar' },
    { symbol: 'GBPUSD', type: 'forex', label: 'British Pound / US Dollar' },
    { symbol: 'USDJPY', type: 'forex', label: 'US Dollar / Japanese Yen' },
    { symbol: 'USDCHF', type: 'forex', label: 'US Dollar / Swiss Franc' },
    { symbol: 'AUDUSD', type: 'forex', label: 'Australian Dollar / US Dollar' },
    { symbol: 'USDCAD', type: 'forex', label: 'US Dollar / Canadian Dollar' },
    { symbol: 'NZDUSD', type: 'forex', label: 'New Zealand Dollar / US Dollar' },
    { symbol: 'EURGBP', type: 'forex', label: 'Euro / British Pound' },
    { symbol: 'EURJPY', type: 'forex', label: 'Euro / Japanese Yen' },
    { symbol: 'GBPJPY', type: 'forex', label: 'British Pound / Japanese Yen' },
    { symbol: 'ES', type: 'futures', label: 'S&P 500 E-mini Futures' },
    { symbol: 'NQ', type: 'futures', label: 'Nasdaq 100 E-mini Futures' },
    { symbol: 'YM', type: 'futures', label: 'Dow Jones E-mini Futures' },
    { symbol: 'CL', type: 'futures', label: 'Crude Oil Futures' },
    { symbol: 'GC', type: 'futures', label: 'Gold Futures' },
    { symbol: 'SI', type: 'futures', label: 'Silver Futures' },
    { symbol: 'NG', type: 'futures', label: 'Natural Gas Futures' },
    { symbol: 'ZB', type: 'futures', label: '30-Year Treasury Bond Futures' },
    { symbol: 'ZN', type: 'futures', label: '10-Year Treasury Note Futures' },
    { symbol: '6E', type: 'futures', label: 'Euro FX Futures' },
  ]

  const [symbolSuggestions, setSymbolSuggestions] = useState([])
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false)

  const [screenshots, setScreenshots] = useState([])
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Identified clear setup', done: false },
    { id: 2, text: 'Risk/Reward ≥ 1:2', done: false },
    { id: 3, text: 'Position size calculated', done: false },
    { id: 4, text: 'Stop loss placed', done: false },
    { id: 5, text: 'Take profit placed', done: false },
  ])

  const [pnlPreview, setPnlPreview] = useState(0)
  const [roiPreview, setRoiPreview] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.getTrades().then(res => {
      const used = new Set(res.trades.map(t => t.symbol).filter(Boolean))
      setSymbolSuggestions(ALL_SYMBOLS.filter(s => used.has(s.symbol) || !used.size).slice(0, 10))
    }).catch(() => setSymbolSuggestions(ALL_SYMBOLS.slice(0, 10)))
  }, [])

  useEffect(() => {
    if (isEdit) {
      api.getTrade(id).then(trade => {
        if (trade) {
          setForm({
            date: trade.date?.split('T')[0] || trade.date,
            symbol: trade.symbol,
            marketType: trade.marketType,
            direction: trade.direction,
            entryPrice: String(trade.entryPrice),
            exitPrice: trade.exitPrice != null ? String(trade.exitPrice) : '',
            margin: String(trade.margin || (trade.entryPrice * trade.quantity) || ''),
            leverage: String(trade.leverage || '1'),
            stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : '',
            takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : '',
            fees: String(trade.fees || 0),
            strategy: trade.strategy || '',
            emotion: trade.emotion || '',
            rating: trade.rating || '',
            tags: trade.tags || '',
            notes: trade.notes || '',
            currentPrice: trade.currentPrice != null ? String(trade.currentPrice) : '',
            checklist: trade.checklist || '',
          })
          if (trade.screenshots) {
            try {
              const saved = JSON.parse(trade.screenshots)
              if (Array.isArray(saved)) setScreenshots(saved)
            } catch {}
          }
          if (trade.checklist) {
            try {
              const saved = JSON.parse(trade.checklist)
              if (Array.isArray(saved)) setChecklistItems(saved)
            } catch {}
          }
        }
      }).catch(() => navigate('/'))
    }
  }, [id])

  useEffect(() => {
    const ep = parseFloat(form.entryPrice)
    const exp = parseFloat(form.exitPrice)
    const margin = parseFloat(form.margin)
    const leverage = parseFloat(form.leverage) || 1
    const f = parseFloat(form.fees) || 0
    const qty = (!isNaN(ep) && !isNaN(margin) && ep > 0) ? (margin * leverage) / ep : 0
    if (!isNaN(ep) && qty > 0) {
      const pnl = !isNaN(exp) ? calcPnl(form.direction, ep, exp, qty, f) : 0
      setPnlPreview(pnl)
      setRoiPreview(calcRoi(pnl, ep, qty))
    } else {
      setPnlPreview(0)
      setRoiPreview(0)
    }
  }, [form.entryPrice, form.exitPrice, form.margin, form.leverage, form.fees, form.direction])

  function validate() {
    const errs = {}
    if (!form.symbol.trim()) errs.symbol = 'Symbol is required'
    if (!form.entryPrice || parseFloat(form.entryPrice) <= 0) errs.entryPrice = 'Valid entry price required'
    if (!form.margin || parseFloat(form.margin) <= 0) errs.margin = 'Valid margin required'
    if (!form.leverage || parseFloat(form.leverage) < 1) errs.leverage = 'Leverage must be at least 1x'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const margin = parseFloat(form.margin)
      const leverage = parseFloat(form.leverage) || 1
      const ep = parseFloat(form.entryPrice)
      const quantity = ep > 0 ? (margin * leverage) / ep : 0
      const data = {
        ...form,
        entryPrice: ep,
        exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : null,
        margin,
        leverage,
        quantity: Math.round(quantity * 10000) / 10000,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        fees: parseFloat(form.fees) || 0,
        currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : null,
        screenshots: JSON.stringify(screenshots),
        checklist: JSON.stringify(checklistItems),
      }
      if (isEdit) await api.updateTrade(id, data)
      else await api.createTrade(data)
      navigate('/trades')
    } catch (e) {
      console.error('Failed to save trade:', e)
    } finally {
      setSaving(false)
    }
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function toggleChecklist(id) {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function addChecklistItem() {
    const newId = Math.max(...checklistItems.map(i => i.id), 0) + 1
    setChecklistItems(prev => [...prev, { id: newId, text: '', done: false }])
    setTimeout(() => {
      const inputs = document.querySelectorAll('.checklist-input')
      const last = inputs[inputs.length - 1]
      if (last) last.focus()
    }, 50)
  }

  function updateChecklistText(id, text) {
    setChecklistItems(prev => prev.map(item => item.id === id ? { ...item, text } : item))
  }

  function removeChecklistItem(id) {
    setChecklistItems(prev => prev.filter(item => item.id !== id))
  }

  function handleSymbolInput(value) {
    const upper = value.toUpperCase()
    update('symbol', upper)
    const filtered = upper.length > 0
      ? ALL_SYMBOLS.filter(s => s.symbol.includes(upper))
      : ALL_SYMBOLS
    setSymbolSuggestions(filtered.slice(0, 10))
    setShowSymbolDropdown(filtered.length > 0)
  }

  function selectSymbol(item) {
    update('symbol', item.symbol)
    update('marketType', item.type)
    setShowSymbolDropdown(false)
  }

  function handleScreenshotUpload(e) {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        setScreenshots(prev => [...prev, ev.target.result])
      }
      reader.readAsDataURL(file)
    })
    if (e.target) e.target.value = ''
  }

  function removeScreenshot(index) {
    setScreenshots(prev => prev.filter((_, i) => i !== index))
  }

  const isOpen = !form.exitPrice && !isEdit

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {isEdit ? '✏️ Edit Trade' : '⊕ New Trade'}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{isEdit ? 'Update your trade details' : 'Log a new trade to your journal'}</p>
      </motion.div>

      <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Symbol</label>
            <input type="text" value={form.symbol} onChange={e => handleSymbolInput(e.target.value)} onFocus={() => { const filtered = form.symbol.length > 0 ? ALL_SYMBOLS.filter(s => s.symbol.includes(form.symbol)) : ALL_SYMBOLS; setSymbolSuggestions(filtered.slice(0, 10)); setShowSymbolDropdown(filtered.length > 0) }} onBlur={() => setTimeout(() => setShowSymbolDropdown(false), 200)} placeholder="e.g. AAPL, BTC/USD, EURUSD" required autoComplete="off" />
            {showSymbolDropdown && symbolSuggestions.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
                {symbolSuggestions.map(s => (
                  <button key={s.symbol} type="button" onMouseDown={() => selectSymbol(s)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                    <span className="font-semibold">{s.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">{s.type}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-auto">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
            {errors.symbol && <p className="text-[#ef4444] text-xs mt-1">{errors.symbol}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Market Type</label>
            <select value={form.marketType} onChange={e => update('marketType', e.target.value)}>
              {marketTypes.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Direction</label>
            <div className="flex gap-2">
              {['long', 'short'].map(d => (
                <button key={d} type="button" onClick={() => update('direction', d)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    form.direction === d
                      ? d === 'long' ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]' : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]'
                      : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border border-transparent hover:border-[var(--border-hover)]'
                  }`}
                >{d === 'long' ? '▲ Long' : '▼ Short'}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-6">
          <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Price & Quantity</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Entry Price</label>
              <input type="number" step="any" value={form.entryPrice} onChange={e => update('entryPrice', e.target.value)} placeholder="0.00" required />
              {errors.entryPrice && <p className="text-[#ef4444] text-xs mt-1">{errors.entryPrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Exit Price {isOpen && <span className="text-xs text-[var(--text-muted)]">(leave empty if open)</span>}</label>
              <input type="number" step="any" value={form.exitPrice} onChange={e => update('exitPrice', e.target.value)} placeholder="Leave empty for open" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Margin ($)</label>
              <input type="number" step="any" value={form.margin} onChange={e => update('margin', e.target.value)} placeholder="e.g. 1000" required />
              {errors.margin && <p className="text-[#ef4444] text-xs mt-1">{errors.margin}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Leverage</label>
              <div className="flex gap-1">
                {[1, 2, 5, 10, 20, 50, 100, 200].map(l => (
                  <button key={l} type="button" onClick={() => update('leverage', String(l))}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      form.leverage === String(l)
                        ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[rgba(16,185,129,0.3)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border border-transparent hover:border-[var(--border-hover)]'
                    }`}
                  >{l}x</button>
                ))}
              </div>
              <input type="number" min="1" step="1" value={form.leverage} onChange={e => update('leverage', e.target.value)} className="mt-2" placeholder="Custom" />
              {errors.leverage && <p className="text-[#ef4444] text-xs mt-1">{errors.leverage}</p>}
            </div>
          </div>
          {!form.exitPrice && (
            <div className="mt-4 p-3 rounded-xl bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)]">
              <label className="block text-sm font-medium text-[var(--color-accent)] mb-1.5">Current Price (for unrealized P&L)</label>
              <input type="number" step="any" value={form.currentPrice} onChange={e => update('currentPrice', e.target.value)} placeholder="Current market price" />
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-6">
          <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Risk Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Stop Loss</label>
              <input type="number" step="any" value={form.stopLoss} onChange={e => update('stopLoss', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Take Profit</label>
              <input type="number" step="any" value={form.takeProfit} onChange={e => update('takeProfit', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Fees</label>
              <input type="number" step="any" value={form.fees} onChange={e => update('fees', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-6">
          <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Journal & Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Strategy</label>
              <select value={form.strategy} onChange={e => update('strategy', e.target.value)}>
                {strategies.map(s => <option key={s} value={s}>{s || 'Select strategy...'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Emotion</label>
              <select value={form.emotion} onChange={e => update('emotion', e.target.value)}>
                {emotions.map(e => <option key={e} value={e}>{e || 'How did you feel?'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Rating</label>
              <div className="flex gap-1">
                {ratings.filter(Boolean).map(r => (
                  <button key={r} type="button" onClick={() => update('rating', r === form.rating ? '' : r)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      form.rating === r
                        ? r === 'A' ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]'
                          : r === 'B' ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1] border border-[rgba(99,102,241,0.3)]'
                          : r === 'C' ? 'bg-[rgba(234,179,8,0.15)] text-[#eab308] border border-[rgba(234,179,8,0.3)]'
                          : r === 'D' ? 'bg-[rgba(249,115,22,0.15)] text-[#f97316] border border-[rgba(249,115,22,0.3)]'
                          : 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border border-transparent hover:border-[var(--border-hover)]'
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tags <span className="text-xs text-[var(--text-muted)]">(comma-separated)</span></label>
            <input type="text" value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g. earnings, breakout, high-risk" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Trade notes, reasoning, lessons learned..." className="resize-none" />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Screenshots <span className="text-xs text-[var(--text-muted)]">(max 5MB each)</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {screenshots.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Screenshot ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border border-[var(--border-subtle)]" />
                  <button type="button" onClick={() => removeScreenshot(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--color-red)] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--color-accent)] transition-colors flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--color-accent)]">
                <span className="text-2xl">+</span>
                <input type="file" accept="image/*" multiple onChange={handleScreenshotUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-[var(--text-secondary)]">Pre-Trade Checklist</h4>
            <button type="button" onClick={addChecklistItem} className="text-xs text-[var(--color-accent)] hover:underline">+ Add item</button>
          </div>
          <div className="space-y-2">
            {checklistItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 group">
                <button type="button" onClick={() => toggleChecklist(item.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs transition-all shrink-0 ${
                    item.done ? 'bg-[#22c55e] border-[#22c55e] text-white' : 'border-[var(--border-subtle)] hover:border-[var(--color-accent)]'
                  }`}
                >{item.done ? '✓' : ''}</button>
                <input type="text" value={item.text} onChange={e => updateChecklistText(item.id, e.target.value)}
                  className={`flex-1 text-sm bg-transparent border-0 px-0 py-1 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-0 ${item.done ? 'line-through opacity-50' : ''}`}
                  placeholder="New checklist item..." />
                <button type="button" onClick={() => removeChecklistItem(item.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[#ef4444] transition-all text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        {(pnlPreview !== 0 || roiPreview !== 0) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="border-t border-[var(--border-subtle)] pt-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.02)]">
              <span className="text-sm text-[var(--text-secondary)]">Projected P&L</span>
              <span className={`text-xl font-bold ${pnlPreview >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {pnlPreview >= 0 ? '+' : ''}${pnlPreview.toFixed(2)}
              </span>
              <span className={`text-sm font-semibold ${roiPreview >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {roiPreview >= 0 ? '+' : ''}{roiPreview.toFixed(2)}%
              </span>
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary text-sm">Cancel</button>
          <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
            {saving ? 'Saving...' : (isEdit ? 'Update Trade' : 'Add Trade')}
          </motion.button>
        </div>
      </motion.form>
    </div>
  )
}
