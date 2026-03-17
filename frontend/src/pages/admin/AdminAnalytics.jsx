import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(7)

  useEffect(() => {
    adminAPI.getAnalytics({ days }).then(r => setData(r.data)).catch(() => setData(MOCK))
  }, [days])

  const d = data || MOCK
  const maxOrders = Math.max(...(d.daily||[]).map(x => x.orders), 1)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Analytics</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-swiggy-dark">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Daily orders chart */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Daily orders & revenue</h2>
        <div className="flex items-end gap-2 h-32">
          {(d.daily||[]).map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-swiggy-gray-dark">{day.orders}</span>
              <div className="w-full flex flex-col gap-0.5">
                <div className="w-full rounded-t-sm bg-swiggy-orange" style={{ height: `${(day.orders/maxOrders)*90}px` }}/>
              </div>
              <span className="text-xs text-swiggy-gray-dark" style={{ fontSize: 9 }}>{String(day.date).slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Zone breakdown */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <h2 className="font-bold text-swiggy-dark text-sm mb-3">Orders by zone</h2>
          {(d.zones||[]).map(z => (
            <div key={z.delivery_zone} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-swiggy-dark">{z.delivery_zone}</span>
                <span className="text-swiggy-gray-dark">{z.orders} orders</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-swiggy-orange rounded-full" style={{ width: `${Math.min((z.orders/100)*100, 100)}%` }}/>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

const today = new Date()
const MOCK = {
  daily: Array.from({length:7},(_,i) => {
    const d = new Date(today); d.setDate(d.getDate()-6+i)
    return { date: d.toISOString().slice(0,10), orders: 80+Math.floor(Math.random()*120), delivered: 75+i*5, revenue: 45000+i*3000 }
  }),
  zones: [{ delivery_zone:'Zone A', orders: 450 },{ delivery_zone:'Zone B', orders: 320 },{ delivery_zone:'Zone C', orders: 210 }]
}
