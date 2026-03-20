import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLogOut, FiMail, FiMapPin, FiPhone, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { customerAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

export default function Profile() {
  const { user, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [address, setAddress] = useState(user?.delivery_address || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    customerAPI.getAddresses()
      .then((res) => setAddress(res.data.delivery_address || user?.delivery_address || ''))
      .catch(() => {})
  }, [user?.delivery_address])

  const saveAddress = async () => {
    if (!address.trim()) {
      toast.error('Enter your delivery address')
      return
    }

    setSaving(true)
    try {
      await customerAPI.updateAddress(address.trim())
      updateUser({ delivery_address: address.trim() })
      toast.success('Delivery address saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Profile</h1>
      <div className="bg-white rounded-xl shadow-card p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-swiggy-orange-light rounded-full flex items-center justify-center text-2xl font-bold text-swiggy-orange">{user?.name?.charAt(0) || 'U'}</div>
          <div>
            <h2 className="font-bold text-swiggy-dark">{user?.name}</h2>
            <p className="text-sm text-swiggy-gray-dark">{user?.email}</p>
          </div>
        </div>
        {[
          { icon: <FiUser />, label: 'Name', value: user?.name },
          { icon: <FiPhone />, label: 'Phone', value: user?.phone },
          { icon: <FiMail />, label: 'Email', value: user?.email }
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 py-3 border-t border-gray-100">
            <span className="text-swiggy-orange">{item.icon}</span>
            <div>
              <p className="text-xs text-swiggy-gray-dark">{item.label}</p>
              <p className="text-sm font-medium text-swiggy-dark">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3 text-swiggy-dark font-bold">
          <FiMapPin className="text-swiggy-orange" />
          Delivery Address
        </div>
        <textarea
          rows={3}
          className="input-field resize-none"
          placeholder="Enter your full delivery address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button onClick={saveAddress} disabled={saving} className="btn-orange mt-3 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>

      <button onClick={() => { logout(); navigate('/') }} className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-500 py-3 rounded-xl font-medium">
        <FiLogOut /> Sign out
      </button>
    </div>
  )
}
