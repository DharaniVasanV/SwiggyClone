import { useState, useEffect } from 'react'
import { workerAPI } from '../../services/api'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MOCK_HOURS = [2,5,8,12,18,22,20,15,10,8,6,4].map((v,i) => ({ hour: `${i*2}:00`, orders: v }))
const MOCK_WEEKLY = DAYS.map((d,i) => ({ day: d, orders: [8,10,6,12,15,18,9][i], earnings: [560,700,420,840,1050,1260,630][i] }))

export default function WorkerAnalytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    workerAPI.getMyStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const maxOrders = Math.max(...MOCK_WEEKLY.map(d => d.orders))

  return (
    <div className="p-4">
      {/* Weekly bar chart */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Orders this week</h2>
        <div className="flex items-end gap-2 h-28">
          {MOCK_WEEKLY.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-swiggy-gray-dark">{d.orders}</span>
              <div className="w-full rounded-t-sm bg-swiggy-orange transition-all"
                style={{ height: `${(d.orders / maxOrders) * 80}px`, opacity: 0.7 + (d.orders/maxOrders)*0.3 }} />
              <span className="text-xs text-swiggy-gray-dark">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Peak hours */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h2 className="font-bold text-swiggy-dark text-sm mb-4">Peak delivery hours</h2>
        <div className="flex items-end gap-1 h-16">
          {MOCK_HOURS.map(h => (
            <div key={h.hour} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t-sm bg-swiggy-green"
                style={{ height: `${(h.orders/22)*100}%`, opacity: 0.5 + (h.orders/22)*0.5 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-swiggy-gray-dark">
          <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
        </div>
        <p className="text-xs text-swiggy-gray-dark mt-2">Peak: 12pm – 2pm & 7pm – 9pm</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Completion rate', value: '97.2%', sub: 'Last 30 days', color: 'text-swiggy-green' },
          { label: 'Avg delivery time', value: '28 min', sub: 'Per order', color: 'text-swiggy-orange' },
          { label: 'Total distance', value: '1,248 km', sub: 'All time', color: 'text-blue-500' },
          { label: 'Customer rating', value: '4.8 ★', sub: 'Out of 5.0', color: 'text-yellow-500' },
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
