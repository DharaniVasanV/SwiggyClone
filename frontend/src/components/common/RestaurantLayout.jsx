import { NavLink, Outlet } from 'react-router-dom'
import { FiGrid, FiLogOut } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'
import { restaurantManagerAPI } from '../../services/api'
import RestaurantPendingApproval from '../../pages/auth/RestaurantPendingApproval'

export default function RestaurantLayout() {
  const { user, logout } = useAuthStore()
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restaurantManagerAPI.getStatus()
      .then(res => setVerificationStatus(res.data.verificationStatus || 'pending'))
      .catch(() => setVerificationStatus('pending'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-swiggy-gray-dark">Loading...</div>
  if (verificationStatus !== 'verified') return <RestaurantPendingApproval verificationStatus={verificationStatus} />

  return (
    <div className="min-h-screen bg-swiggy-gray">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-swiggy-orange font-semibold">Restaurant Console</p>
            <h1 className="text-lg font-bold text-swiggy-dark">{user?.name || 'Restaurant'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/restaurant" className="flex items-center gap-2 text-sm font-medium text-swiggy-dark hover:text-swiggy-orange">
              <FiGrid className="w-4 h-4" /> Dashboard
            </NavLink>
            <button onClick={logout} className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600">
              <FiLogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
