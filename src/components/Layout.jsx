import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◉' },
  { path: '/add', label: 'New Trade', icon: '⊕' },
  { path: '/trades', label: 'History', icon: '☰' },
  { path: '/analytics', label: 'Analytics', icon: '◈' },
]

export default function Layout({ children }) {
  const location = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('tj-theme') || 'dark')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tj-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={`flex h-screen overflow-hidden ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <aside className="w-64 shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] flex flex-col transition-all duration-300 max-md:fixed max-md:h-full max-md:z-50 max-md:-translate-x-full max-md:data-[open=true]:translate-x-0"
        style={{ maxWidth: sidebarOpen ? '16rem' : '0', overflow: 'hidden' }}
      >
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight whitespace-nowrap">TradeJournal</h1>
              <p className="text-xs text-[var(--text-muted)]">Pro Analytics</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="max-md:hidden p-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
            ✕
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.03)]'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--border-subtle)]">
            <span className="text-sm">💼</span>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Portfolio</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Live Tracking</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
              ☰
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="theme-toggle" title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8 max-md:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
