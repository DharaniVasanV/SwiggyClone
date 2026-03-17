import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FiShoppingCart, FiSearch, FiUser, FiMenu, FiX, FiMapPin } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export default function CustomerLayout() {
  const { user, logout } = useAuthStore()
  const itemCount = useCartStore((s) => s.getItemCount())
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="min-h-screen bg-white">
      {/* Swiggy-style Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white shadow-nav border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-swiggy-orange rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-swiggy-dark hidden sm:block">swiggy</span>
            </div>
          </Link>

          {/* Delivery Location */}
          <button className="flex items-center gap-1 text-swiggy-dark hover:text-swiggy-orange transition-colors">
            <FiMapPin className="text-swiggy-orange w-4 h-4" />
            <span className="text-sm font-semibold border-b-2 border-swiggy-dark">
              Home
            </span>
            <span className="text-xs text-swiggy-gray-dark ml-1 hidden md:block truncate max-w-xs">
              123, Main Street, Chennai
            </span>
          </button>

          {/* Search Bar */}
          <div className="flex-1 hidden md:flex items-center bg-swiggy-gray rounded px-3 h-10 gap-2">
            <FiSearch className="text-swiggy-gray-dark w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search for restaurants and food"
              className="bg-transparent flex-1 text-sm outline-none text-swiggy-dark placeholder-swiggy-gray-dark"
              onFocus={() => navigate('/restaurants')}
            />
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4 ml-auto">
            {user ? (
              <>
                <Link to="/orders" className="hidden md:flex items-center gap-1 text-swiggy-dark hover:text-swiggy-orange text-sm font-medium transition-colors">
                  My Orders
                </Link>
                {user.role !== 'customer' && (
                  <Link to={user.role === 'admin' ? '/admin' : '/worker'} className="hidden md:flex items-center gap-1 text-swiggy-orange hover:opacity-80 text-sm font-bold transition-colors">
                    Go to Dashboard
                  </Link>
                )}
                <div className="relative group hidden md:block">
                  <button className="flex items-center gap-1 text-swiggy-dark hover:text-swiggy-orange text-sm font-medium transition-colors">
                    <FiUser className="w-4 h-4" />
                    {user.name.split(' ')[0]}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-card-hover border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link to="/profile" className="block px-4 py-3 text-sm text-swiggy-dark hover:bg-swiggy-gray">Profile</Link>
                    <Link to="/orders" className="block px-4 py-3 text-sm text-swiggy-dark hover:bg-swiggy-gray">My Orders</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-swiggy-gray">Logout</button>
                  </div>
                </div>
              </>
            ) : (
              <Link to="/login" className="hidden md:flex items-center gap-1 text-swiggy-dark hover:text-swiggy-orange text-sm font-semibold transition-colors">
                Sign In
              </Link>
            )}

            {/* Cart */}
            {(!user || user.role === 'customer') && (
              <Link to="/cart" className="relative flex items-center gap-1 bg-white border border-swiggy-orange text-swiggy-orange hover:bg-swiggy-orange hover:text-white transition-colors px-3 py-1.5 rounded text-sm font-semibold">
                <FiShoppingCart className="w-4 h-4" />
                <span className="hidden sm:block">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-swiggy-orange text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-swiggy-dark">
              {menuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-3">
            {user ? (
              <>
                <Link to="/orders" className="block text-sm text-swiggy-dark py-2" onClick={() => setMenuOpen(false)}>My Orders</Link>
                <Link to="/profile" className="block text-sm text-swiggy-dark py-2" onClick={() => setMenuOpen(false)}>Profile</Link>
                <button onClick={handleLogout} className="block text-sm text-red-500 py-2 w-full text-left">Logout</button>
              </>
            ) : (
              <Link to="/login" className="block text-sm font-semibold text-swiggy-orange py-2" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-swiggy-dark text-white mt-16 py-12">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-swiggy-orange rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold">swiggy</span>
            </div>
            <p className="text-gray-400 text-sm">© 2026 Swiggy Platform</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">For Restaurants</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Partner with us</a></li>
              <li><a href="#" className="hover:text-white">Apps for you</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Learn More</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="/worker/register" className="hover:text-white">Deliver with Swiggy</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
