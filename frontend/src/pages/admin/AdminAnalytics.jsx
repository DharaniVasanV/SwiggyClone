import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminAPI.getAnalytics({ days })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <div className="py-20 text-center text-swiggy-gray-dark">Loading analytics...</div>

  if (!data) return (
    <div className="p-6 text-center text-swiggy-gray-dark py-20">
      <p className="text-lg font-medium">Failed to load analytics</p>
      <p className="text-sm mt-1">Check your connection and try again</p>
    </div>
  )

  const daily = data.daily || []
  const zones = data.zones || []
  const peakHours = data.peakHours || []

  const maxOrders = Math.max(...daily.map(x => x.orders), 1)
  const maxRevenue = Math.max(...daily.map(x => x.revenue), 1)
  const maxZone = Math.max(...zones.map(z => z.orders), 1)

  // Build 24-slot hour array
  const hourSlots = Array.from({ length: 24 }, (_, i) => {
    const found = peakHours.find(h => h.hour === i)
    return { hour: i, orders: found?.orders || 0 }
  })
  const maxHour = Math.max(...hourSlots.map(h => h.orders), 1)

  const totalOrders = daily.reduce((s, d) => s + d.orders, 0)
  const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0)
  const totalDelivered = daily.reduce((s, d) => s + (d.delivered || 0), 0)
  const totalFailed = daily.reduce((s, d) => s + (d.failed || 0), 0)
  const successRate = totalOrders ? ((totalDelivered / totalOrders) * 100).toFixed(1) : 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Analytics</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-swiggy-dark">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Orders', value: totalOrders, color: 'text-swiggy-orange' },
          { label: 'Revenue', value: `₹${(totalRevenue/1000).toFixed(1)}k`, color: 'text-swiggy-green' },
          { label: 'Delivered', value: totalDelivered, color: 'text-blue-500' },
          { label: 'Success Rate', value: `${successRate}%`, color: 'text-purple-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-swiggy-gray-dark mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily orders chart */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Daily orders</h2>
        {daily.length === 0 ? (
          <p className="text-center text-swiggy-gray-dark text-sm py-8">No order data for this period</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {daily.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-swiggy-gray-dark">{day.orders}</span>
                <div className="w-full rounded-t-sm bg-swiggy-orange"
                  style={{ height: `${(day.orders / maxOrders) * 90}px`, minHeight: day.orders ? 3 : 0 }} />
                <span className="text-xs text-swiggy-gray-dark" style={{ fontSize: 9 }}>
                  {String(day.date).slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Daily revenue (₹)</h2>
        {daily.length === 0 ? (
          <p className="text-center text-swiggy-gray-dark text-sm py-8">No revenue data for this period</p>
        ) : (
          <div className="flex items-end gap-2 h-32">
            {daily.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-swiggy-gray-dark" style={{ fontSize: 9 }}>
                  {day.revenue >= 1000 ? `₹${(day.revenue / 1000).toFixed(1)}k` : `₹${day.revenue}`}
                </span>
                <div className="w-full rounded-t-sm bg-swiggy-green"
                  style={{ height: `${(day.revenue / maxRevenue) * 90}px`, minHeight: day.revenue ? 3 : 0 }} />
                <span className="text-xs text-swiggy-gray-dark" style={{ fontSize: 9 }}>
                  {String(day.date).slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Zone breakdown */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-bold text-swiggy-dark text-sm mb-3">Orders by zone</h2>
          {zones.length === 0 ? (
            <p className="text-center text-swiggy-gray-dark text-sm py-6">No zone data available</p>
          ) : (
            zones.map(z => (
              <div key={z.delivery_zone} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-swiggy-dark">{z.delivery_zone}</span>
                  <span className="text-swiggy-gray-dark">{z.orders} orders</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-swiggy-orange rounded-full transition-all"
                    style={{ width: `${(z.orders / maxZone) * 100}%` }} />
                </div>
                {z.avg_duration > 0 && (
                  <p className="text-xs text-swiggy-gray-dark mt-0.5">Avg delivery: {z.avg_duration.toFixed(0)} min</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Delivered vs Failed */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-bold text-swiggy-dark text-sm mb-3">Delivery outcomes</h2>
          <div className="space-y-3">
            {[
              { label: 'Delivered', value: totalDelivered, total: totalOrders, color: 'bg-swiggy-green' },
              { label: 'Failed', value: totalFailed, total: totalOrders, color: 'bg-red-400' },
              { label: 'In Progress', value: totalOrders - totalDelivered - totalFailed, total: totalOrders, color: 'bg-swiggy-orange' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-swiggy-dark">{item.label}</span>
                  <span className="text-swiggy-gray-dark">{item.value} ({totalOrders ? ((item.value / totalOrders) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${totalOrders ? (item.value / totalOrders) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Peak hours heatmap */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Order volume by hour</h2>
        {peakHours.length === 0 ? (
          <p className="text-center text-swiggy-gray-dark text-sm py-6">No hourly data available</p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-20">
              {hourSlots.map(h => (
                <div key={h.hour} className="flex-1 flex flex-col items-center">
                  <div className="w-full rounded-t-sm bg-swiggy-orange transition-all"
                    style={{
                      height: `${(h.orders / maxHour) * 100}%`,
                      minHeight: h.orders ? 3 : 0,
                      opacity: 0.3 + (h.orders / maxHour) * 0.7
                    }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-swiggy-gray-dark">
              <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
            </div>
            {peakHours.length > 0 && (() => {
              const peak = peakHours.reduce((a, b) => a.orders > b.orders ? a : b)
              return <p className="text-xs text-swiggy-gray-dark mt-2">Peak hour: {peak.hour}:00 – {peak.hour + 1}:00 ({peak.orders} orders)</p>
            })()}
          </>
        )}
      </div>
    </div>
  )
}
