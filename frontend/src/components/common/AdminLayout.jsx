import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { FiGrid, FiUsers, FiPackage, FiMap, FiTrendingUp, FiCoffee, FiLogOut, FiKey } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'

const NAV = [
  { to: '/admin', icon: <FiGrid />, label: 'Dashboard', exact: true },
  { to: '/admin/live-map', icon: <FiMap />, label: 'Live Map' },
  { to: '/admin/workers', icon: <FiUsers />, label: 'Workers' },
  { to: '/admin/orders', icon: <FiPackage />, label: 'Orders' },
  { to: '/admin/analytics', icon: <FiTrendingUp />, label: 'Analytics' },
  { to: '/admin/restaurants', icon: <FiCoffee />, label: 'Restaurants' },
  { to: '/admin/api-access', icon: <FiKey />, label: 'API Access' },
]

export default function AdminLayout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-swiggy-dark text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-swiggy-orange rounded-full flex items-center justify-center text-xs font-bold">S</div>
            <div>
              <div className="text-sm font-bold">swiggy</div>
              <div className="text-xs text-gray-400">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-2 rounded-lg mb-0.5 ${
                  active ? 'bg-swiggy-orange text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-swiggy-orange rounded-full flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name}</div>
              <div className="text-xs text-gray-400">Admin</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors w-full">
            <FiLogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
