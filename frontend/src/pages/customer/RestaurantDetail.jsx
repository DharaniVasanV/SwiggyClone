import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiStar, FiClock, FiChevronDown, FiChevronUp, FiMinus, FiPlus, FiShoppingCart } from 'react-icons/fi'
import { restaurantAPI } from '../../services/api'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const MOCK_MENU = {
  restaurant: { id: '550e8400-e29b-41d4-a716-446655440000', name: "Domino's Pizza", cuisine_type: 'Pizza, Italian', rating: 4.5, delivery_time: '25-30', delivery_fee: 29, address: '123 MG Road, Chennai' },
  categories: [
    { name: 'Best Sellers', items: [
      { id: '550e8400-e29b-41d4-a716-446655440011', name: 'Margherita Pizza', description: 'Classic tomato sauce, mozzarella, fresh basil', price: 249, is_veg: true },
      { id: '550e8400-e29b-41d4-a716-446655440012', name: 'Farmhouse Pizza', description: 'Capsicum, onion, tomato, mushroom', price: 329, is_veg: true },
      { id: '550e8400-e29b-41d4-a716-446655440013', name: 'Peppy Paneer', description: 'Paneer, capsicum, red paprika', price: 369, is_veg: true },
    ]},
    { name: 'Non-Veg Pizzas', items: [
      { id: '550e8400-e29b-41d4-a716-446655440014', name: 'Chicken Dominator', description: 'Double chicken sausage, grilled chicken rashers', price: 499, is_veg: false },
      { id: '550e8400-e29b-41d4-a716-446655440015', name: 'Keema Do Pyaza', description: 'Chicken keema, caramelized onion', price: 419, is_veg: false },
    ]},
    { name: 'Sides & Extras', items: [
      { id: '550e8400-e29b-41d4-a716-446655440016', name: 'Garlic Bread', description: 'Crispy garlic bread with herb butter', price: 99, is_veg: true },
      { id: '550e8400-e29b-41d4-a716-446655440017', name: 'Chicken Wings', description: '6 crispy wings with dipping sauce', price: 199, is_veg: false },
    ]},
    { name: 'Beverages', items: [
      { id: '550e8400-e29b-41d4-a716-446655440018', name: 'Coke 750ml', description: '', price: 69, is_veg: true },
      { id: '550e8400-e29b-41d4-a716-446655440019', name: 'Pepsi 750ml', description: '', price: 69, is_veg: true },
    ]},
  ]
}

export default function RestaurantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addItem, getItemQuantity, removeItem, items: cartItems, restaurantId } = useCartStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState({})
  const [switchWarning, setSwitchWarning] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        if (res.data?.categories?.length) {
          setData(res.data)
        } else {
          setData(MOCK_MENU)
        }
      } catch { setData(MOCK_MENU) }
      finally { setLoading(false) }
    }
    fetch()
  }, [id])

  const handleAdd = (item) => {
    if (!user) { navigate('/login'); return }
    const result = addItem(item, id, data?.restaurant?.name)
    if (result === 'switched') toast.success('Cart updated for new restaurant')
    else toast.success(`${item.name} added!`, { icon: '🛒' })
    setSwitchWarning(null)
  }

  const total = useCartStore((s) => s.getTotal())
  const itemCount = useCartStore((s) => s.getItemCount())

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="shimmer h-48 rounded-xl mb-6" />{[...Array(6)].map((_, i) => <div key={i} className="shimmer h-24 rounded-lg mb-3" />)}</div>

  const { restaurant: r, categories } = data || MOCK_MENU

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/restaurants')} className="text-swiggy-gray-dark hover:text-swiggy-dark text-sm font-medium mb-4 flex items-center gap-1">
        ← Back to restaurants
      </button>
      {/* Restaurant Header */}
      <div className="bg-white rounded-xl shadow-card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-swiggy-dark">{r.name}</h1>
            <p className="text-swiggy-gray-dark text-sm mt-1">{r.cuisine_type}</p>
            <p className="text-swiggy-gray-dark text-xs mt-1">{r.address}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 bg-swiggy-green text-white px-2 py-1 rounded font-bold text-sm">
              <FiStar className="w-3 h-3" />
              {Number(r.rating).toFixed(1)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center gap-1 text-swiggy-dark font-semibold text-sm">
              <FiClock className="w-4 h-4 text-swiggy-orange" />
              {r.delivery_time} mins
            </div>
            <p className="text-xs text-swiggy-gray-dark">Delivery time</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <div className="font-semibold text-sm text-swiggy-dark">₹{r.delivery_fee || 'Free'}</div>
            <p className="text-xs text-swiggy-gray-dark">Delivery fee</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <div className="font-semibold text-sm text-swiggy-dark">₹150</div>
            <p className="text-xs text-swiggy-gray-dark">Min. order</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Menu */}
        <div className="flex-1">
          {categories?.map((cat) => (
            <div key={cat.name} className="mb-4">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [cat.name]: !c[cat.name] }))}
                className="flex items-center justify-between w-full py-3 text-left"
              >
                <h2 className="font-bold text-swiggy-dark text-base">{cat.name} ({cat.items.length})</h2>
                {collapsed[cat.name] ? <FiChevronDown className="w-5 h-5 text-swiggy-gray-dark" /> : <FiChevronUp className="w-5 h-5 text-swiggy-gray-dark" />}
              </button>

              {!collapsed[cat.name] && cat.items.map((item) => {
                const qty = getItemQuantity(item.id)
                return (
                  <div key={item.id} className="flex gap-4 py-4 border-t border-gray-100">
                    {/* Veg/Non-veg indicator */}
                    <div className="flex-shrink-0 mt-1">
                      {item.is_veg ? (
                        <div className="w-4 h-4 border-2 border-swiggy-green rounded-sm flex items-center justify-center">
                          <div className="w-2 h-2 bg-swiggy-green rounded-full" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-red-600 rounded-sm flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-600 rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-swiggy-dark text-sm">{item.name}</h3>
                      <p className="font-semibold text-swiggy-dark text-sm mt-0.5">₹{item.price}</p>
                      {item.description && <p className="text-xs text-swiggy-gray-dark mt-1 leading-relaxed">{item.description}</p>}
                    </div>
                    {/* Add/quantity control */}
                    <div className="flex-shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(item)}
                          className="border border-swiggy-orange text-swiggy-orange font-bold text-sm px-5 py-2 rounded hover:bg-swiggy-orange hover:text-white transition-colors"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 border border-swiggy-orange rounded overflow-hidden">
                          <button onClick={() => removeItem(item.id)} className="p-2 text-swiggy-orange hover:bg-swiggy-orange-light">
                            <FiMinus className="w-3 h-3" />
                          </button>
                          <span className="text-swiggy-orange font-bold text-sm min-w-4 text-center">{qty}</span>
                          <button onClick={() => handleAdd(item)} className="p-2 text-swiggy-orange hover:bg-swiggy-orange-light">
                            <FiPlus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-swiggy-green text-white p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <span className="font-bold">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
              <span className="mx-2">•</span>
              <span>₹{total}</span>
            </div>
            <button onClick={() => navigate('/cart')} className="flex items-center gap-2 bg-white text-swiggy-green font-bold px-5 py-2 rounded hover:opacity-90 transition-opacity">
              <FiShoppingCart className="w-4 h-4" />
              View Cart →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
