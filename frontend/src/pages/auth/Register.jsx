import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true)
    try {
      const res = await authAPI.register(form)
      setAuth(res.data.user, res.data.token)
      toast.success('Account created!')
      navigate('/')
    } catch (err) { toast.error(err.response?.data?.error || 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-swiggy-gray px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-swiggy-orange rounded-xl flex items-center justify-center mx-auto mb-2"><span className="text-white font-bold text-xl">S</span></div>
          <h1 className="text-xl font-bold text-swiggy-dark">Create account</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="input-field" placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required/>
          <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} required/>
          <input className="input-field" type="tel" placeholder="Phone (+91...)" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} required/>
          <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required/>
          <button type="submit" disabled={loading} className="btn-orange w-full disabled:opacity-60">{loading?'Creating...':'Create Account'}</button>
        </form>
        <p className="text-center text-sm text-swiggy-gray-dark mt-4">Already have an account? <Link to="/login" className="text-swiggy-orange font-medium">Sign in</Link></p>
      </div>
    </div>
  )
}
