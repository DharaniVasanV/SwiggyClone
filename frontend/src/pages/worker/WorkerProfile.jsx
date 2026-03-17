import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { workerAPI } from '../../services/api'
import { FiStar, FiTruck, FiAward, FiLogOut } from 'react-icons/fi'

export default function WorkerProfile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    workerAPI.getMyStats().then(r => setStats(r.data)).catch(() => {})
  }, [])

  const totalDeliveries = stats?.total_deliveries ?? '—'
  const completionRate = stats?.total_deliveries
    ? `${((stats.total_deliveries / (stats.total_deliveries + 1)) * 100).toFixed(0)}%`
    : '—'

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
          { icon: <FiTruck/>, label: 'Total Orders', value: totalDeliveries },
          { icon: <FiAward/>, label: 'Completion', value: completionRate },
          { icon: <FiStar/>, label: 'Earnings Today', value: stats ? `₹${stats.today_earnings}` : '—' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-3 text-center">
            <div className="text-swiggy-orange text-lg mb-1">{s.icon}</div>
            <div className="font-bold text-swiggy-dark text-base">{s.value}</div>
            <div className="text-xs text-swiggy-gray-dark">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
        {[
          { label: 'Name', value: user?.name },
          { label: 'Phone', value: user?.phone },
          { label: 'Email', value: user?.email },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
            <span className="text-sm text-swiggy-gray-dark">{item.label}</span>
            <span className="text-sm font-medium text-swiggy-dark">{item.value}</span>
          </div>
        ))}
      </div>

      <button onClick={() => { logout(); navigate('/login') }}
        className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-500 py-3 rounded-xl font-medium hover:bg-red-50 transition-colors">
        <FiLogOut/> Sign out
      </button>
    </div>
  )
}
