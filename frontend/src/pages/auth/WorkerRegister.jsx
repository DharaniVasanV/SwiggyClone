import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { FiUpload, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

const STEPS = ['Personal Info', 'Vehicle & Experience', 'Documents', 'OTP Verify']

export default function WorkerRegister() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    vehicle_type: '', zone: '', id_proof_type: '', platform_experience_years: 0,
    id_proof: null, selfie: null, otp: ''
  })
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    authAPI.getWorkerZones()
      .then(res => setZones((res.data.zones || []).map(zone => zone.zone_name).filter(Boolean)))
      .catch(() => setZones([]))
      .finally(() => setZonesLoading(false))
  }, [])

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setFile = (field) => (e) => setForm({ ...form, [field]: e.target.files[0] })

  const handleRegister = async () => {
    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v && k !== 'otp') fd.append(k, v) })
      const res = await authAPI.workerRegister(fd)
      setAuth(res.data.user, res.data.token)
      setStep(3)
      toast.success('Registration submitted!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally { setLoading(false) }
  }

  const handleOtpVerify = async () => {
    setLoading(true)
    try {
      await authAPI.verifyOtp(form.phone, form.otp)
      toast.success('Phone verified! Awaiting admin approval.')
      navigate('/worker') // WorkerLayout will show pending screen automatically
    } catch { toast.error('Invalid OTP') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-swiggy-gray flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-6">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-swiggy-orange rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-xl font-bold text-swiggy-dark">Deliver with Swiggy</h1>
          <p className="text-sm text-swiggy-gray-dark mt-1">Earn money on your own schedule</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-swiggy-green text-white' : i === step ? 'bg-swiggy-orange text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <FiCheck className="w-3 h-3" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 mx-1 ${i < step ? 'bg-swiggy-green' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-swiggy-gray-dark mb-5">{STEPS[step]}</p>

        {/* Step 0 - Personal Info */}
        {step === 0 && (
          <div className="space-y-3">
            <input className="input-field" placeholder="Full name" value={form.name} onChange={set('name')} />
            <input className="input-field" type="email" placeholder="Email address" value={form.email} onChange={set('email')} />
            <input className="input-field" type="tel" placeholder="Phone number (+91...)" value={form.phone} onChange={set('phone')} />
            <input className="input-field" type="password" placeholder="Create password" value={form.password} onChange={set('password')} />
            <button onClick={() => { if (form.name && form.email && form.phone && form.password) setStep(1); else toast.error('Fill all fields') }}
              className="btn-orange w-full">Continue</button>
          </div>
        )}

        {/* Step 1 - Vehicle & Experience */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Vehicle type</label>
              <select className="input-field" value={form.vehicle_type} onChange={set('vehicle_type')}>
                <option value="">Select vehicle</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="scooter">Scooter</option>
                <option value="bicycle">Bicycle</option>
                <option value="car">Car</option>
                <option value="on_foot">On foot</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Years of delivery experience</label>
              <select className="input-field" value={form.platform_experience_years} onChange={set('platform_experience_years')}>
                <option value={0}>Fresher (0 years)</option>
                <option value={1}>1 year</option>
                <option value={2}>2 years</option>
                <option value={3}>3+ years</option>
                <option value={5}>5+ years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Delivery zone</label>
              <select className="input-field" value={form.zone} onChange={set('zone')} disabled={zonesLoading || zones.length === 0}>
                <option value="">{zonesLoading ? 'Loading zones...' : zones.length ? 'Select your zone' : 'No zones available'}</option>
                {zones.map(zone => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
              {!zonesLoading && zones.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Admin has not added any available zones yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="btn-outline-orange flex-1">Back</button>
              <button onClick={() => { if (form.vehicle_type && form.zone) setStep(2); else toast.error('Select vehicle and zone') }} className="btn-orange flex-1" disabled={zonesLoading || zones.length === 0}>Continue</button>
            </div>
          </div>
        )}

        {/* Step 2 - Documents */}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">ID Proof type</label>
              <select className="input-field" value={form.id_proof_type} onChange={set('id_proof_type')}>
                <option value="">Select ID type</option>
                <option value="aadhar">Aadhar Card</option>
                <option value="pan">PAN Card</option>
                <option value="driving_license">Driving License</option>
                <option value="voter_id">Voter ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Upload ID Proof</label>
              <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer hover:border-swiggy-orange transition-colors">
                <FiUpload className="text-swiggy-orange" />
                <span className="text-sm text-swiggy-gray-dark">{form.id_proof?.name || 'Click to upload (JPG/PNG/PDF)'}</span>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={setFile('id_proof')} />
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-swiggy-dark mb-1">Selfie (optional)</label>
              <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer hover:border-swiggy-orange transition-colors">
                <FiUpload className="text-swiggy-orange" />
                <span className="text-sm text-swiggy-gray-dark">{form.selfie?.name || 'Upload your selfie'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={setFile('selfie')} />
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn-outline-orange flex-1">Back</button>
              <button onClick={handleRegister} disabled={loading || !form.id_proof_type}
                className="btn-orange flex-1 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - OTP */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-swiggy-green/10 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📱</span>
            </div>
            <p className="text-sm text-swiggy-gray-dark">Enter the 6-digit OTP sent to<br /><strong>{form.phone}</strong></p>
            <input className="input-field text-center text-xl tracking-widest" maxLength={6} placeholder="• • • • • •"
              value={form.otp} onChange={set('otp')} />
            <button onClick={handleOtpVerify} disabled={loading || form.otp.length < 6} className="btn-orange w-full disabled:opacity-60">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <p className="text-xs text-swiggy-gray-dark">Didn't receive?{' '}
              <button className="text-swiggy-orange font-medium" onClick={() => authAPI.sendOtp(form.phone)}>Resend OTP</button>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-swiggy-gray-dark mt-5">
          Already registered? <Link to="/login" className="text-swiggy-orange font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
