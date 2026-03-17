import { useState, useEffect } from 'react'
import { workerAPI } from '../../services/api'

export default function WorkerAnalytics() {
  const [stats, setStats] = useState(null)
  const [earnings, setEarnings] = useState([])
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      workerAPI.getMyStats().catch(() => ({ data: {} })),
      workerAPI.getMyEarnings(period).catch(() => ({ data: { earnings: [], summary: {} } }))
    ]).then(([statsRes, earningsRes]) => {
      setStats(statsRes.data)
      setEarnings(earningsRes.data.earnings || [])
    }).finally(() => setLoading(false))
  }, [period])

  // Build daily chart from earnings data
  const dailyMap = earnings.reduce((acc, e) => {
    const date = e.earned_at ? new Date(e.earned_at).toLocaleDateString('en-IN', { weekday: 'short' }) : 'N/A'
    if (!acc[date]) acc[date] = { day: date, orders: 0, earnings: 0 }
    acc[date].orders++
    acc[date].earnings += e.total_earning || 0
    return acc
  }, {})
  const daily = Object.values(dailyMap).slice(-7)
  const maxOrders = Math.max(...daily.map(d => d.orders), 1)

  // Build hourly distribution
  const hourMap = earnings.reduce((acc, e) => {
    if (!e.earned_at) return acc
    const h = Math.floor(new Date(e.earned_at).getHours() / 2) * 2
    acc[h] = (acc[h] || 0) + 1
    return acc
  }, {})
  const hours = Array.from({ length: 12 }, (_, i) => ({ hour: i * 2, orders: hourMap[i * 2] || 0 }))
  const maxHour = Math.max(...hours.map(h => h.orders), 1)

  const totalEarnings = earnings.reduce((s, e) => s + (e.total_earning || 0), 0)
  const totalDistance = earnings.reduce((s, e) => s + (e.distance_km || 0), 0)
  const avgPerOrder = earnings.length ? totalEarnings / earnings.length : 0
  const completionRate = stats?.total_deliveries
    ? ((stats.total_deliveries / (stats.total_deliveries + 1)) * 100).toFixed(1)
    : '—'

  if (loading) return <div className="py-20 text-center text-swiggy-gray-dark">Loading analytics...</div>

  return (
    <div className="p-4">
      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {[['week', 'This Week'], ['month', 'This Month'], ['day', 'Today']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === v ? 'bg-swiggy-orange text-white' : 'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Daily orders bar chart */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Orders & Earnings</h2>
        {daily.length === 0 ? (
          <p className="text-center text-swiggy-gray-dark text-sm py-8">No delivery data for this period</p>
        ) : (
          <div className="flex items-end gap-2 h-28">
            {daily.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-swiggy-gray-dark">{d.orders}</span>
                <div className="w-full rounded-t-sm bg-swiggy-orange transition-all"
                  style={{ height: `${(d.orders / maxOrders) * 80}px`, minHeight: d.orders ? 4 : 0 }} />
                <span className="text-xs text-swiggy-gray-dark">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Peak hours */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Delivery hours distribution</h2>
        <div className="flex items-end gap-1 h-16">
          {hours.map(h => (
            <div key={h.hour} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t-sm bg-swiggy-green"
                style={{ height: `${(h.orders / maxHour) * 100}%`, minHeight: h.orders ? 3 : 0, opacity: 0.5 + (h.orders / maxHour) * 0.5 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-swiggy-gray-dark">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total earnings', value: `₹${totalEarnings.toFixed(0)}`, sub: `${period === 'day' ? 'Today' : period === 'week' ? 'This week' : 'This month'}`, color: 'text-swiggy-green' },
          { label: 'Avg per order', value: `₹${avgPerOrder.toFixed(0)}`, sub: `${earnings.length} orders`, color: 'text-swiggy-orange' },
          { label: 'Distance covered', value: `${totalDistance.toFixed(1)} km`, sub: 'This period', color: 'text-blue-500' },
          { label: 'Total deliveries', value: stats?.total_deliveries ?? '—', sub: 'All time', color: 'text-purple-500' },
          { label: 'Today\'s orders', value: stats?.today_orders ?? '—', sub: 'Completed today', color: 'text-swiggy-orange' },
          { label: 'Today\'s earnings', value: `₹${stats?.today_earnings ?? 0}`, sub: 'Earned today', color: 'text-swiggy-green' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-swiggy-dark mt-1">{s.label}</p>
            <p className="text-xs text-swiggy-gray-dark">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
