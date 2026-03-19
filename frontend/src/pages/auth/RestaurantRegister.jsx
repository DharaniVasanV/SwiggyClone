import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function RestaurantRegister() {
  const [zones, setZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(true)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    owner_name: '',
    restaurant_name: '',
    cuisine_type: '',
    address: '',
    zone: '',
    lat: '',
    lng: '',
    email: '',
    phone: '',
    password: '',
    business_proof_type: '',
    business_proof: null,
    storefront_photo: null,
    otp: ''
  })
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    authAPI.getWorkerZones()
      .then(res => setZones((res.data.zones || []).map(zone => zone.zone_name).filter(Boolean)))
      .catch(() => setZones([]))
      .finally(() => setLoadingZones(false))
  }, [])

  const setField = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setFile = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.files[0] }))

  const handleRegister = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value && key !== 'otp') fd.append(key, value)
      })
      const res = await authAPI.restaurantRegister(fd)
      setAuth(res.data.user, res.data.token)
      toast.success('Restaurant application submitted')
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerify = async () => {
    setLoading(true)
    try {
      await authAPI.verifyOtp(form.phone, form.otp)
      toast.success('Phone verified. Awaiting admin approval.')
      navigate('/restaurant')
    } catch {
      toast.error('Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-swiggy-gray flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-card p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-swiggy-orange rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-xl font-bold text-swiggy-dark">Register Your Restaurant</h1>
          <p className="text-sm text-swiggy-gray-dark mt-1">Submit your restaurant details, proof documents, and phone verification</p>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <input className="input-field" placeholder="Owner name" value={form.owner_name} onChange={setField('owner_name')} required />
            <input className="input-field" placeholder="Restaurant name" value={form.restaurant_name} onChange={setField('restaurant_name')} required />
            <input className="input-field" placeholder="Cuisine type" value={form.cuisine_type} onChange={setField('cuisine_type')} required />
            <input className="input-field" placeholder="Restaurant address" value={form.address} onChange={setField('address')} required />
            <select className="input-field" value={form.zone} onChange={setField('zone')} disabled={loadingZones || zones.length === 0} required>
              <option value="">{loadingZones ? 'Loading zones...' : zones.length ? 'Select zone' : 'No zones available'}</option>
              {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
            </select>
            <input className="input-field" placeholder="Latitude" value={form.lat} onChange={setField('lat')} required />
            <input className="input-field" placeholder="Longitude" value={form.lng} onChange={setField('lng')} required />
            <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={setField('email')} required />
            <input className="input-field" type="tel" placeholder="Phone (+91...)" value={form.phone} onChange={setField('phone')} required />
            <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={setField('password')} required />
            <button onClick={() => {
              if (form.owner_name && form.restaurant_name && form.cuisine_type && form.address && form.zone && form.lat && form.lng && form.email && form.phone && form.password) {
                setStep(1)
              } else {
                toast.error('Fill all required details')
              }
            }} className="btn-orange w-full" disabled={loadingZones || zones.length === 0}>
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <select className="input-field" value={form.business_proof_type} onChange={setField('business_proof_type')}>
              <option value="">Select business proof type</option>
              <option value="fssai">FSSAI License</option>
              <option value="gst">GST Certificate</option>
              <option value="shop_license">Shop License</option>
              <option value="trade_license">Trade License</option>
            </select>
            <label className="block border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer">
              <span className="text-sm text-swiggy-gray-dark">{form.business_proof?.name || 'Upload business proof'}</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={setFile('business_proof')} />
            </label>
            <label className="block border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer">
              <span className="text-sm text-swiggy-gray-dark">{form.storefront_photo?.name || 'Upload storefront photo'}</span>
              <input type="file" className="hidden" accept="image/*" onChange={setFile('storefront_photo')} />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="btn-outline-orange flex-1">Back</button>
              <button onClick={handleRegister} disabled={loading || !form.business_proof_type || !form.business_proof}
                className="btn-orange flex-1 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-swiggy-gray-dark text-center">Enter the OTP sent to <strong>{form.phone}</strong></p>
            <input className="input-field text-center text-xl tracking-widest" maxLength={6} placeholder="Enter OTP" value={form.otp} onChange={setField('otp')} />
            <button onClick={handleOtpVerify} disabled={loading || form.otp.length < 6} className="btn-orange w-full disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-swiggy-gray-dark mt-4">
          Already have an account? <Link to="/login" className="text-swiggy-orange font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
