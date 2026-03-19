import { useEffect, useState } from 'react'
import { FiCheckCircle, FiClock, FiMessageSquare, FiPlus, FiStar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { restaurantManagerAPI } from '../../services/api'

const emptyMenuForm = { name: '', description: '', price: '', category: '', image_url: '' }

export default function RestaurantDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyMenuForm)

  useEffect(() => {
    restaurantManagerAPI.getDashboard()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const addMenuItem = async () => {
    if (!form.name || !form.price) {
      toast.error('Name and price are required')
      return
    }

    setSaving(true)
    try {
      const res = await restaurantManagerAPI.addMenuItem({
        ...form,
        price: Number(form.price),
        is_available: true
      })
      setData(prev => prev ? {
        ...prev,
        menuItems: [res.data.item, ...(prev.menuItems || [])],
        stats: { ...prev.stats, menu_items: (prev.stats?.menu_items || 0) + 1 }
      } : prev)
      setForm(emptyMenuForm)
      toast.success('Menu item added')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add menu item')
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailability = async (item) => {
    try {
      await restaurantManagerAPI.updateMenuItem(item.id, { is_available: !item.is_available })
      setData(prev => prev ? {
        ...prev,
        menuItems: prev.menuItems.map(menuItem => menuItem.id === item.id ? { ...menuItem, is_available: !menuItem.is_available } : menuItem)
      } : prev)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update menu item')
    }
  }

  const markPickedUp = async (orderId) => {
    try {
      await restaurantManagerAPI.markOrderPickedUp(orderId)
      setData(prev => prev ? {
        ...prev,
        orders: prev.orders.map(order => order.id === orderId ? { ...order, status: 'picked_up' } : order)
      } : prev)
      toast.success('Order marked as picked up')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update order')
    }
  }

  if (loading) return <div className="py-16 text-center text-swiggy-gray-dark">Loading restaurant dashboard...</div>
  if (!data?.restaurant) return <div className="py-16 text-center text-swiggy-gray-dark">Restaurant dashboard is unavailable.</div>

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-swiggy-orange font-semibold">Restaurant</p>
            <h2 className="text-2xl font-bold text-swiggy-dark mt-1">{data.restaurant.name}</h2>
            <p className="text-sm text-swiggy-gray-dark mt-1">{data.restaurant.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            {[
              { label: 'Total Orders', value: data.stats?.total_orders ?? 0, icon: <FiClock className="w-4 h-4" /> },
              { label: 'Active Orders', value: data.stats?.active_orders ?? 0, icon: <FiCheckCircle className="w-4 h-4" /> },
              { label: 'Menu Items', value: data.stats?.menu_items ?? 0, icon: <FiPlus className="w-4 h-4" /> },
              { label: 'Avg Rating', value: data.stats?.avg_rating ?? 0, icon: <FiStar className="w-4 h-4" /> },
            ].map(card => (
              <div key={card.label} className="bg-swiggy-gray rounded-xl p-4">
                <div className="flex items-center gap-2 text-swiggy-orange">{card.icon}<span className="text-xs font-medium text-swiggy-gray-dark">{card.label}</span></div>
                <div className="text-xl font-bold text-swiggy-dark mt-2">{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-swiggy-dark">Orders</h3>
            <span className="text-xs text-swiggy-gray-dark">{data.orders?.length || 0} total</span>
          </div>
          <div className="space-y-3">
            {(data.orders || []).length === 0 ? (
              <p className="text-sm text-swiggy-gray-dark">No orders yet.</p>
            ) : data.orders.map(order => (
              <div key={order.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-swiggy-dark">{order.order_number}</p>
                    <p className="text-sm text-swiggy-gray-dark">{order.customer_name} • {order.customer_phone || 'No phone'}</p>
                    <p className="text-xs text-swiggy-gray-dark mt-1">{order.delivery_address}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-swiggy-orange/10 text-swiggy-orange font-semibold capitalize">{order.status}</span>
                </div>
                <div className="mt-3 text-sm text-swiggy-dark">
                  {(order.items || []).map(item => `${item.name} x${item.quantity}`).join(', ')}
                </div>
                {order.worker_id && order.status !== 'picked_up' && order.status !== 'delivered' && (
                  <button onClick={() => markPickedUp(order.id)} className="mt-4 btn-orange text-sm px-4 py-2">
                    Mark Picked Up By Delivery Person
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-bold text-swiggy-dark mb-4">Add Menu Item</h3>
            <div className="space-y-3">
              {[
                ['name', 'Item name'],
                ['description', 'Description'],
                ['price', 'Price'],
                ['category', 'Category'],
                ['image_url', 'Image URL']
              ].map(([key, placeholder]) => (
                <input
                  key={key}
                  className="input-field"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                />
              ))}
              <button onClick={addMenuItem} disabled={saving} className="btn-orange w-full disabled:opacity-60">
                {saving ? 'Saving...' : 'Add Menu Item'}
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-bold text-swiggy-dark mb-4">Menu</h3>
            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {(data.menuItems || []).length === 0 ? (
                <p className="text-sm text-swiggy-gray-dark">No menu items yet.</p>
              ) : data.menuItems.map(item => (
                <div key={item.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-swiggy-dark">{item.name}</p>
                      <p className="text-xs text-swiggy-gray-dark">{item.category || 'Other'} • Rs {item.price}</p>
                    </div>
                    <button onClick={() => toggleAvailability(item)} className={`text-xs px-2 py-1 rounded-full font-semibold ${item.is_available ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiMessageSquare className="w-4 h-4 text-swiggy-orange" />
              <h3 className="text-lg font-bold text-swiggy-dark">Customer Reviews</h3>
            </div>
            <div className="space-y-3">
              {(data.reviews || []).length === 0 ? (
                <p className="text-sm text-swiggy-gray-dark">No customer reviews yet.</p>
              ) : data.reviews.map(review => (
                <div key={review.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-swiggy-dark">{review.customer_name || 'Customer'}</p>
                    <span className="text-xs bg-swiggy-green text-white px-2 py-1 rounded-full">{review.rating || 0} / 5</span>
                  </div>
                  <p className="text-sm text-swiggy-gray-dark mt-2">{review.comment || 'No written feedback provided.'}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
