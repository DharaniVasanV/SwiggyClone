import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { FiGrid, FiPackage, FiDollarSign, FiTrendingUp, FiUser } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useWorkerStore } from '../../store/workerStore'
import { connectSocket, subscribeToNewOrders, disconnectSocket } from '../../services/socket'
import { workerAPI } from '../../services/api'
import WorkerPendingApproval from '../../pages/auth/WorkerPendingApproval'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/worker', icon: <FiGrid />, label: 'Home', exact: true },
  { to: '/worker/orders', icon: <FiPackage />, label: 'Orders' },
  { to: '/worker/earnings', icon: <FiDollarSign />, label: 'Earnings' },
  { to: '/worker/analytics', icon: <FiTrendingUp />, label: 'Analytics' },
  { to: '/worker/profile', icon: <FiUser />, label: 'Profile' },
]

export default function WorkerLayout() {
  const { pathname } = useLocation()
  const { user, setAuth, token } = useAuthStore()
  const { addAvailableOrder } = useWorkerStore()
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [checkingVerification, setCheckingVerification] = useState(true)

  useEffect(() => {
    // Check verification status from backend
    workerAPI.getDashboard()
      .then(res => {
        const status = res.data.verificationStatus || 'pending'
        setVerificationStatus(status)
      })
      .catch(() => setVerificationStatus('pending'))
      .finally(() => setCheckingVerification(false))
  }, [])

  useEffect(() => {
    if (verificationStatus !== 'verified') return
    // Connect socket ONCE when worker enters the layout, not on every page mount
    connectSocket()
    const unsub = subscribeToNewOrders((order) => {
      toast.success(`New order at ${order.restaurant_name}: ₹${order.worker_earning}`, { icon: '🛵', duration: 6000 })
      addAvailableOrder(order)
    })
    return () => {
      unsub?.()
      disconnectSocket()
    }
  }, [verificationStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  if (checkingVerification) return <div className="min-h-screen flex items-center justify-center text-swiggy-gray-dark">Loading...</div>

  if (verificationStatus !== 'verified') {
    return <WorkerPendingApproval verificationStatus={verificationStatus} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      {/* Top bar */}
      <header className="bg-swiggy-dark text-white px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-swiggy-orange rounded-full flex items-center justify-center text-sm font-bold">S</div>
          <span className="font-bold text-lg italic tracking-tight">swiggy <span className="text-swiggy-orange">partner</span></span>
        </div>
        <div className="text-sm font-medium text-gray-300 bg-white/10 px-3 py-1.5 rounded-full">{user?.name}</div>
      </header>

      {/* Page content */}
      <main className="flex-1 pb-24 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex z-40 shadow-lg-up">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
          return (
            <Link key={item.to} to={item.to}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                active ? 'nav-active' : 'text-gray-500 hover:text-swiggy-dark'
              }`}>
              <span className="text-lg mb-0.5">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

