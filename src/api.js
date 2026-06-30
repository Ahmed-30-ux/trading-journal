const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  getTrades(params = {}) {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.sortBy) q.set('sortBy', params.sortBy)
    if (params.sortOrder) q.set('sortOrder', params.sortOrder)
    if (params.marketType) q.set('marketType', params.marketType)
    if (params.direction) q.set('direction', params.direction)
    if (params.page) q.set('page', params.page)
    if (params.limit) q.set('limit', params.limit)
    const qs = q.toString()
    return request(`/trades${qs ? `?${qs}` : ''}`)
  },
  getTrade(id) { return request(`/trades/${id}`) },
  createTrade(data) { return request('/trades', { method: 'POST', body: JSON.stringify(data) }) },
  updateTrade(id, data) { return request(`/trades/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteTrade(id) { return request(`/trades/${id}`, { method: 'DELETE' }) },
  getStats() { return request('/stats') },
}
