import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { orderAPI, restaurantAPI } from '../../services/api'
import { FiMapPin } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function Checkout() {
  const { items, restaurantId, getTotal, clearCart } = useCartStore()
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [restaurant, setRestaurant] = useState(null)
  const navigate = useNavigate()
  const total = getTotal()
  const deliveryFee = total > 299 ? 0 : (Number.isFinite(Number(restaurant?.delivery_fee)) ? Number(restaurant.delivery_fee) : 29)

  useEffect(() => {
    if (!restaurantId) return
    restaurantAPI.getById(restaurantId).then((res) => setRestaurant(res.data)).catch(() => setRestaurant(null))
  }, [restaurantId])

  const placeOrder = async () => {
    if (!address) { toast.error('Enter delivery address'); return }
    setLoading(true)
    try {
      const res = await orderAPI.place({
        restaurant_id: restaurantId,
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        delivery_address: address,
        delivery_zone: null,
        subtotal: total, delivery_fee: deliveryFee, total_amount: total + deliveryFee
      })
      clearCart()
      toast.success('Order placed!', { icon: '🎉' })
      navigate(`/order/${res.data.order.id}/track`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place order')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Checkout</h1>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        <h3 className="font-bold text-swiggy-dark text-sm mb-3 flex items-center gap-2"><FiMapPin className="text-swiggy-orange"/>Delivery address</h3>
        <textarea rows={3} className="input-field resize-none" placeholder="Enter your full delivery address..." value={address} onChange={e => setAddress(e.target.value)}/>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-5">
        <h3 className="font-bold text-swiggy-dark text-sm mb-3">Order summary</h3>
        {items.map(i => (
          <div key={i.id} className="flex justify-between text-sm py-1.5">
            <span>{i.quantity}x {i.name}</span><span>₹{i.price * i.quantity}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-swiggy-gray-dark">Delivery fee</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>₹{total + deliveryFee}</span></div>
        </div>
      </div>

      <button 
        onClick={placeOrder} 
        disabled={loading || !address} 
        className={`w-full text-base py-3.5 rounded-lg font-bold transition-all shadow-lg ${
          !address 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-swiggy-orange text-white hover:bg-swiggy-orange-dark pulse-orange'
        }`}
      >
        {loading ? 'Placing order...' : `CONFIRM & PLACE ORDER · ₹${total + deliveryFee}`}
      </button>
    </div>
  )
}
