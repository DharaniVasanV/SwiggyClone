import { useState, useEffect } from 'react'
import { workerAPI } from '../../services/api'
import { FiTrendingUp, FiCalendar, FiMapPin } from 'react-icons/fi'

export default function WorkerEarnings() {
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('week')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    workerAPI.getMyEarnings(period)
      .then(r => setData(r.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false))
  }, [period])

  const d = data || MOCK

  return (
    <div className="p-4">
      {/* Period selector */}
      <div className="flex gap-2 mb-5">
        {['day','week','month'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${period === p ? 'bg-swiggy-orange text-white' : 'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>
            {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-swiggy-dark text-white rounded-xl p-5 mb-5">
        <p className="text-gray-400 text-sm mb-1">Total earned</p>
        <p className="text-4xl font-bold text-swiggy-orange">₹{Number(d.summary?.total_earnings || 0).toFixed(0)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <div><p className="text-gray-400">Orders</p><p className="font-semibold">{d.summary?.total_orders || 0}</p></div>
          <div><p className="text-gray-400">Avg/order</p><p className="font-semibold">₹{Number(d.summary?.avg_per_order || 0).toFixed(0)}</p></div>
          <div><p className="text-gray-400">Distance</p><p className="font-semibold">{Number(d.summary?.total_distance || 0).toFixed(1)}km</p></div>
        </div>
      </div>

      {/* Earnings list */}
      <h2 className="font-bold text-swiggy-dark mb-3">Order breakdown</h2>
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="shimmer h-16 rounded-lg"/>)}</div>
      ) : (
        <div className="space-y-2">
          {(d.earnings || MOCK.earnings).map((e, i) => (
            <div key={i} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-swiggy-dark">{e.order_number || `ORD-${i+1}`}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-swiggy-gray-dark">
                  <span className="flex items-center gap-1"><FiMapPin className="w-3 h-3"/>{Number(e.distance_km||0).toFixed(1)}km</span>
                  <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3"/>{e.date || 'Today'}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-swiggy-green">₹{Number(e.total_earning||0).toFixed(0)}</p>
                <div className="flex items-center gap-1 text-xs text-swiggy-gray-dark mt-0.5">
                  <FiTrendingUp className="w-3 h-3"/>
                  {e.duration_min || 25} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MOCK = {
  summary: { total_earnings: 4820, total_orders: 64, avg_per_order: 75.3, total_distance: 248 },
  earnings: [
    { order_number: 'ORD-4521', total_earning: 85, distance_km: 5.2, duration_min: 28, date: 'Today' },
    { order_number: 'ORD-4518', total_earning: 60, distance_km: 3.8, duration_min: 22, date: 'Today' },
    { order_number: 'ORD-4510', total_earning: 95, distance_km: 6.1, duration_min: 35, date: 'Yesterday' },
    { order_number: 'ORD-4505', total_earning: 70, distance_km: 4.5, duration_min: 26, date: 'Yesterday' },
    { order_number: 'ORD-4498', total_earning: 110, distance_km: 7.8, duration_min: 42, date: '14 Mar' },
  ]
}
