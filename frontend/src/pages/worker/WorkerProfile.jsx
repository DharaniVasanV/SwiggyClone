import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { FiStar, FiTruck, FiAward, FiLogOut } from 'react-icons/fi'

export default function WorkerProfile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="p-4">
      {/* Profile Card */}
      <div className="bg-swiggy-dark text-white rounded-xl p-5 mb-4 text-center">
        <div className="w-16 h-16 bg-swiggy-orange rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {user?.name?.charAt(0) || 'W'}
        </div>
        <h2 className="text-lg font-bold">{user?.name || 'Delivery Partner'}</h2>
        <p className="text-gray-400 text-sm">{user?.phone}</p>
        <div className="flex justify-center gap-4 mt-4">
          <div className="flex items-center gap-1 bg-swiggy-green text-white text-xs px-3 py-1.5 rounded-full font-bold">
            <FiStar className="w-3 h-3"/> 4.8
          </div>
          <div className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-full">
            Verified Partner
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: <FiTruck/>, label: 'Total Orders', value: '487' },
          { icon: <FiAward/>, label: 'Completion', value: '97%' },
          { icon: <FiStar/>, label: 'Rating', value: '4.8' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-3 text-center">
            <div className="text-swiggy-orange text-lg mb-1">{s.icon}</div>
            <div className="font-bold text-swiggy-dark text-base">{s.value}</div>
            <div className="text-xs text-swiggy-gray-dark">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
        {[
          { label: 'Vehicle Type', value: 'Motorcycle' },
          { label: 'Experience', value: '2 years' },
          { label: 'Zone', value: 'Zone A, Chennai' },
          { label: 'Member since', value: 'Jan 2025' },
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
