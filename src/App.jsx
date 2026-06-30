import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import TradeForm from './components/TradeForm.jsx'
import TradeList from './components/TradeList.jsx'
import Analytics from './components/Analytics.jsx'

export default function App() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<TradeForm />} />
          <Route path="/edit/:id" element={<TradeForm />} />
          <Route path="/trades" element={<TradeList />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
