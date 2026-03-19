import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      setAuth(res.data.user, res.data.token)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      if (res.data.user.role === 'admin') navigate('/admin')
      else if (res.data.user.role === 'worker') navigate('/worker')
      else if (res.data.user.role === 'restaurant') navigate('/restaurant')
      else navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-swiggy-orange-light flex-col items-center justify-center p-12">
        <div className="w-16 h-16 bg-swiggy-orange rounded-2xl flex items-center justify-center mb-6">
          <span className="text-white text-3xl font-bold">S</span>
        </div>
        <h1 className="text-3xl font-bold text-swiggy-dark mb-3">swiggy</h1>
        <p className="text-swiggy-gray-dark text-center max-w-xs">Order food from the best restaurants near you. Fast delivery guaranteed.</p>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-swiggy-dark mb-1">Sign in</h2>
          <p className="text-swiggy-gray-dark text-sm mb-6">Access your Swiggy account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-orange w-full disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-swiggy-gray-dark">
            New to Swiggy?{' '}
            <Link to="/register" className="text-swiggy-orange font-medium hover:underline">Create account</Link>
          </div>
          <div className="mt-3 text-center text-sm text-swiggy-gray-dark">
            Delivery partner?{' '}
            <Link to="/worker/register" className="text-swiggy-orange font-medium hover:underline">Register here</Link>
          </div>
          <div className="mt-3 text-center text-sm text-swiggy-gray-dark">
            Restaurant owner?{' '}
            <Link to="/restaurant/register" className="text-swiggy-orange font-medium hover:underline">Register here</Link>
          </div>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-swiggy-gray rounded-lg">
            <p className="text-xs font-medium text-swiggy-dark mb-2">Demo accounts</p>
            <div className="space-y-1 text-xs text-swiggy-gray-dark">
              <p>Admin: admin@test.com / admin123</p>
              <p>Worker: ravi@test.com / password123</p>
              <p>Customer: customer@test.com / password123</p>
              <p>Restaurant: created from Admin -> Restaurants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
