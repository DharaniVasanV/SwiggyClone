import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'

const badgeStyles = {
  verified: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  suspended: 'bg-gray-100 text-gray-600'
}

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.getRestaurants()
      .then(r => setRestaurants(r.data || []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [])

  const verify = async (id, status) => {
    try {
      await adminAPI.verifyRestaurant(id, status)
      setRestaurants(prev => prev.map(restaurant => restaurant.id === id ? {
        ...restaurant,
        verification_status: status,
        is_active: status === 'verified'
      } : restaurant))
      toast.success(`Restaurant ${status}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update restaurant')
    }
  }

  const removeRestaurant = async (id) => {
    try {
      await adminAPI.deleteRestaurant(id)
      setRestaurants(prev => prev.filter(restaurant => restaurant.id !== id))
      toast.success('Restaurant removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove restaurant')
    }
  }

  if (loading) return <div className="p-6 text-center text-swiggy-gray-dark py-20">Loading restaurants...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Restaurant Applications ({restaurants.length})</h1>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center text-swiggy-gray-dark">No restaurant registrations yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {restaurants.map(restaurant => (
            <div key={restaurant.id} className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-swiggy-dark">{restaurant.name}</p>
                  <p className="text-xs text-swiggy-gray-dark">{restaurant.cuisine_type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badgeStyles[restaurant.verification_status || 'pending'] || badgeStyles.pending}`}>
                  {restaurant.verification_status || 'pending'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-swiggy-gray-dark">Owner</p>
                  <p className="font-medium text-swiggy-dark">{restaurant.owner_name || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-swiggy-gray-dark">Zone</p>
                  <p className="font-medium text-swiggy-dark">{restaurant.zone || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-swiggy-gray-dark">Email</p>
                  <p className="font-medium text-swiggy-dark break-all">{restaurant.contact_email || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-swiggy-gray-dark">Phone</p>
                  <p className="font-medium text-swiggy-dark">{restaurant.contact_phone || '—'}</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs mb-4">
                {restaurant.business_proof_url && <a href={restaurant.business_proof_url} target="_blank" rel="noreferrer" className="text-swiggy-orange hover:underline">View business proof</a>}
                {restaurant.storefront_photo_url && <a href={restaurant.storefront_photo_url} target="_blank" rel="noreferrer" className="text-swiggy-orange hover:underline">View storefront</a>}
              </div>

              <p className="text-xs text-swiggy-gray-dark mb-4">{restaurant.address}</p>

              <div className="flex gap-2">
                {restaurant.verification_status === 'pending' && (
                  <>
                    <button onClick={() => verify(restaurant.id, 'verified')} className="flex-1 bg-swiggy-green text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                      Approve
                    </button>
                    <button onClick={() => verify(restaurant.id, 'rejected')} className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                      Reject
                    </button>
                  </>
                )}
                {restaurant.verification_status === 'verified' && (
                  <>
                    <button onClick={() => verify(restaurant.id, 'suspended')} className="flex-1 bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-300">
                      Suspend
                    </button>
                    <button onClick={() => removeRestaurant(restaurant.id)} className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                      Remove
                    </button>
                  </>
                )}
                {restaurant.verification_status === 'suspended' && (
                  <>
                    <button onClick={() => verify(restaurant.id, 'verified')} className="flex-1 bg-swiggy-green text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                      Reinstate
                    </button>
                    <button onClick={() => removeRestaurant(restaurant.id)} className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                      Remove
                    </button>
                  </>
                )}
                {restaurant.verification_status === 'rejected' && (
                  <button onClick={() => removeRestaurant(restaurant.id)} className="w-full bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:opacity-90">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
