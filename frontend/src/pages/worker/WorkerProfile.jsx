import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiAward, FiLogOut, FiStar, FiTruck } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { workerAPI } from '../../services/api'

export default function WorkerProfile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    workerAPI.getMyStats().then((r) => setStats(r.data)).catch(() => {})
  }, [])

  const totalDeliveries = stats?.total_deliveries ?? '-'
  const completionRate = stats?.daily_target_orders
    ? `${stats.daily_completion_rate ?? 0}%`
    : 'No target'
  const completionLabel = stats?.daily_target_orders
    ? `${stats.today_orders || 0}/${stats.daily_target_orders} today`
    : 'Ask admin to set zone target'

  return (
    <div className="p-4">
      <div className="bg-swiggy-dark text-white rounded-xl p-5 mb-4 text-center">
        <div className="w-16 h-16 bg-swiggy-orange rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {user?.name?.charAt(0) || 'W'}
        </div>
        <h2 className="text-lg font-bold">{user?.name || 'Delivery Partner'}</h2>
        <p className="text-gray-400 text-sm">{user?.phone}</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full">
            Verified Partner
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: <FiTruck />, label: 'Total Orders', value: totalDeliveries, sub: 'All time' },
          { icon: <FiAward />, label: 'Completion', value: completionRate, sub: completionLabel },
          { icon: <FiStar />, label: 'Earnings Today', value: stats ? `Rs ${stats.today_earnings}` : '-', sub: stats?.worker_zone || 'Today' }
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-card p-3 text-center">
            <div className="text-swiggy-orange text-lg mb-1">{card.icon}</div>
            <div className="font-bold text-swiggy-dark text-base">{card.value}</div>
            <div className="text-xs text-swiggy-gray-dark">{card.label}</div>
            <div className="text-[11px] text-swiggy-gray-dark mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
        {[
          { label: 'Name', value: user?.name },
          { label: 'Phone', value: user?.phone },
          { label: 'Email', value: user?.email }
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
            <span className="text-sm text-swiggy-gray-dark">{item.label}</span>
            <span className="text-sm font-medium text-swiggy-dark">{item.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => { logout(); navigate('/login') }}
        className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors"
      >
        <FiLogOut /> Sign out
      </button>
    </div>
  )
}
