import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { FiMinus, FiPlus, FiTrash2, FiArrowLeft } from 'react-icons/fi'

export default function Cart() {
  const { items, restaurantName, addItem, removeItem, deleteItem, getTotal, restaurantId } = useCartStore()
  const total = getTotal()
  const deliveryFee = total > 299 ? 0 : 29
  const navigate = useNavigate()

  if (!items.length) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-xl font-bold text-swiggy-dark mb-2">Your cart is empty</h2>
      <p className="text-swiggy-gray-dark mb-6">Add items from a restaurant to get started</p>
      <button onClick={() => navigate('/')} className="btn-orange">Browse restaurants</button>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-swiggy-gray-dark hover:text-swiggy-dark mb-4 text-sm">
        <FiArrowLeft/> Back
      </button>
      <h1 className="text-xl font-bold text-swiggy-dark mb-1">Your Cart</h1>
      <p className="text-sm text-swiggy-gray-dark mb-5">{restaurantName}</p>

      <div className="bg-white rounded-xl shadow-card p-4 mb-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-swiggy-dark">{item.name}</p>
              <p className="text-sm font-bold text-swiggy-dark mt-0.5">₹{item.price * item.quantity}</p>
            </div>
            <div className="flex items-center gap-2 border border-swiggy-orange rounded overflow-hidden">
              <button onClick={() => removeItem(item.id)} className="p-1.5 text-swiggy-orange hover:bg-swiggy-orange-light"><FiMinus className="w-3 h-3"/></button>
              <span className="text-swiggy-orange font-bold text-sm min-w-4 text-center">{item.quantity}</span>
              <button onClick={() => addItem(item, restaurantId, restaurantName)} className="p-1.5 text-swiggy-orange hover:bg-swiggy-orange-light"><FiPlus className="w-3 h-3"/></button>
            </div>
            <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 ml-1"><FiTrash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card p-4 mb-5">
        <h3 className="font-bold text-swiggy-dark text-sm mb-3">Bill details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-swiggy-gray-dark">Item total</span><span>₹{total}</span></div>
          <div className="flex justify-between"><span className="text-swiggy-gray-dark">Delivery fee</span><span>{deliveryFee === 0 ? <span className="text-swiggy-green">FREE</span> : `₹${deliveryFee}`}</span></div>
          <div className="flex justify-between font-bold text-swiggy-dark pt-2 border-t border-gray-100">
            <span>Total</span><span>₹{total + deliveryFee}</span>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/checkout')} className="btn-orange w-full flex items-center justify-between px-5 py-3.5">
        <span>{items.reduce((s,i)=>s+i.quantity,0)} items</span>
        <span>Proceed to checkout →</span>
        <span>₹{total + deliveryFee}</span>
      </button>
    </div>
  )
}
