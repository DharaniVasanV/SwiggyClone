import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function OtpVerify() {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { state } = useLocation()
  const phone = state?.phone || ''

  const verify = async () => {
    setLoading(true)
    try {
      await authAPI.verifyOtp(phone, otp)
      toast.success('Phone verified!')
      navigate('/')
    } catch { toast.error('Invalid OTP') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-swiggy-gray px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-card p-6 text-center">
        <div className="text-4xl mb-4">📱</div>
        <h2 className="text-xl font-bold text-swiggy-dark mb-2">Verify your number</h2>
        <p className="text-sm text-swiggy-gray-dark mb-5">Enter the OTP sent to <strong>{phone}</strong></p>
        <input className="input-field text-center text-2xl tracking-widest mb-4" maxLength={6} placeholder="• • • • • •" value={otp} onChange={e => setOtp(e.target.value)}/>
        <button onClick={verify} disabled={loading || otp.length < 6} className="btn-orange w-full disabled:opacity-60">
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
        <p className="text-xs text-swiggy-gray-dark mt-3">
          Didn't get it? <button className="text-swiggy-orange font-medium" onClick={() => authAPI.sendOtp(phone)}>Resend</button>
        </p>
      </div>
    </div>
  )
}
