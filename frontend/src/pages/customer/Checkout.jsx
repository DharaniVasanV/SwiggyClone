import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { customerAPI, orderAPI, restaurantAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export default function Checkout() {
  const { items, restaurantId, getTotal, clearCart } = useCartStore()
  const { user, updateUser } = useAuthStore()
  const [address, setAddress] = useState(user?.delivery_address || '')
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState(null)
  const navigate = useNavigate()
  const total = getTotal()
  const deliveryFee = total > 299 ? 0 : (Number.isFinite(Number(restaurant?.delivery_fee)) ? Number(restaurant.delivery_fee) : 29)

  useEffect(() => {
    if (!restaurantId) return
    restaurantAPI.getById(restaurantId).then((res) => setRestaurant(res.data)).catch(() => setRestaurant(null))
    customerAPI.getAddresses()
      .then((res) => setAddress(res.data.delivery_address || user?.delivery_address || ''))
      .catch(() => {})
  }, [restaurantId, user?.delivery_address])

  const placeOrder = async () => {
    if (!address.trim()) {
      toast.error('Enter delivery address')
      return
    }

    setLoading(true)
    try {
      const trimmedAddress = address.trim()
      await customerAPI.updateAddress(trimmedAddress).catch(() => {})
      updateUser({ delivery_address: trimmedAddress })

      const res = await orderAPI.place({
        restaurant_id: restaurantId,
        items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        delivery_address: trimmedAddress,
        delivery_zone: null,
        subtotal: total,
        delivery_fee: deliveryFee,
        total_amount: total + deliveryFee
      })
      clearCart()
      toast.success('Order placed!', { icon: '🎉' })
      navigate(`/order/${res.data.order.id}/track`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Checkout</h1>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h3 className="font-bold text-swiggy-dark text-sm mb-3 flex items-center gap-2"><FiMapPin className="text-swiggy-orange" />Delivery address</h3>
        <textarea rows={3} className="input-field resize-none" placeholder="Enter your full delivery address..." value={address} onChange={(e) => setAddress(e.target.value)} />
        <p className="text-xs text-swiggy-gray-dark mt-2">This address will also be saved to your profile for reorder and future checkouts.</p>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-5">
        <h3 className="font-bold text-swiggy-dark text-sm mb-3">Order summary</h3>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1.5">
            <span>{item.quantity}x {item.name}</span>
            <span>Rs {item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-swiggy-gray-dark">Delivery fee</span><span>{deliveryFee === 0 ? 'FREE' : `Rs ${deliveryFee}`}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>Rs {total + deliveryFee}</span></div>
        </div>
      </div>

      <button
        onClick={placeOrder}
        disabled={loading || !address.trim()}
        className={`w-full text-base py-3.5 rounded-lg font-bold transition-all shadow-lg ${
          !address.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-swiggy-orange text-white hover:bg-swiggy-orange-dark pulse-orange'
        }`}
      >
        {loading ? 'Placing order...' : `CONFIRM & PLACE ORDER - Rs ${total + deliveryFee}`}
      </button>
    </div>
  )
}
