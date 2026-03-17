import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiToggleLeft, FiToggleRight, FiTruck, FiDollarSign, FiClock, FiMapPin } from 'react-icons/fi'
import { workerAPI } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { connectSocket, subscribeToNewOrders, emitWorkerLocation } from '../../services/socket'
import toast from 'react-hot-toast'

export default function WorkerDashboard() {
  const { user } = useAuthStore()
  const [status, setStatus] = useState('offline')
  const [stats, setStats] = useState(null)
  const [availableOrders, setAvailableOrders] = useState([])
  const [activeOrder, setActiveOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await workerAPI.getDashboard()
        setStats(res.data.stats)
        setAvailableOrders(res.data.availableOrders || [])
        setActiveOrder(res.data.activeOrder || null)
        setStatus(res.data.status || 'offline')
      } catch { 
        toast.error('Failed to fetch real-time stats')
      }
      finally { setLoading(false) }
    }
    fetchDashboard()

    const socket = connectSocket()
    const unsub = subscribeToNewOrders((order) => {
      toast.success(`New order at ${order.restaurant_name}: ₹${order.worker_earning}`, { icon: '🛵', duration: 5000 })
      setAvailableOrders((o) => {
        if (o.find(x => x.id === order.id)) return o
        return [order, ...o]
      })
    })

    // GPS tracking every 5 seconds when online
    let gpsInterval
    if (navigator.geolocation) {
      gpsInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          emitWorkerLocation(lat, lng, activeOrder?.id, pos.coords.speed || 0)
          workerAPI.updateLocation(lat, lng, pos.coords.speed || 0).catch(() => {})
        })
      }, 5000)
    }
    return () => { unsub?.(); clearInterval(gpsInterval) }
  }, [activeOrder?.id])

  const toggleStatus = async () => {
    const newStatus = status === 'offline' ? 'available' : 'offline'
    try {
      await workerAPI.setStatus(newStatus)
      setStatus(newStatus)
      toast.success(newStatus === 'available' ? 'You are now online!' : 'You are now offline')
    } catch { toast.error('Failed to update status') }
  }

  const acceptOrder = async (orderId) => {
    try {
      const res = await workerAPI.acceptOrder(orderId)
      setActiveOrder(res.data.order)
      setAvailableOrders((o) => o.filter((x) => x.id !== orderId))
      toast.success('Order accepted!', { icon: '✅' })
    } catch { toast.error('Failed to accept order') }
  }

  return (
    <div className="py-6">
      {/* Status Toggle */}
      <div className="bg-swiggy-dark text-white rounded-xl p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-300">You are currently</p>
          <p className={`text-xl font-bold ${status === 'available' ? 'text-swiggy-green' : 'text-gray-400'}`}>
            {status === 'available' ? 'Online' : status === 'delivering' ? 'On Delivery' : 'Offline'}
          </p>
        </div>
        <button onClick={toggleStatus} className="text-4xl transition-transform hover:scale-105">
          {status !== 'offline'
            ? <FiToggleRight className="text-swiggy-green" />
            : <FiToggleLeft className="text-gray-500" />}
        </button>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: <FiTruck />, label: "Today's orders", value: stats?.today_orders || 0, color: 'text-swiggy-orange' },
          { icon: <FiDollarSign />, label: "Today's earnings", value: `₹${stats?.today_earnings || 0}`, color: 'text-swiggy-green' },
          { icon: <FiClock />, label: 'Hours active', value: `${stats?.active_hours || 0}h`, color: 'text-blue-500' },
          { icon: <FiMapPin />, label: 'Distance today', value: `${stats?.distance_km || 0}km`, color: 'text-purple-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-4">
            <div className={`text-xl mb-1 ${s.color}`}>{s.icon}</div>
            <div className="text-xl font-bold text-swiggy-dark">{s.value}</div>
            <div className="text-xs text-swiggy-gray-dark">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Order */}
      {activeOrder && (
        <div className="bg-swiggy-orange text-white rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base">Active Delivery</span>
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded">#{activeOrder.order_number}</span>
          </div>
          <p className="text-sm opacity-90 mb-1">📍 Pick up: {activeOrder.pickup_address}</p>
          <p className="text-sm opacity-90 mb-3">📦 Deliver to: {activeOrder.delivery_address}</p>
          <Link to={`/worker/delivery/${activeOrder.id}`}
            className="block text-center bg-white text-swiggy-orange font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity">
            View Delivery Map →
          </Link>
        </div>
      )}

      {/* Available Orders */}
      <div>
        <h2 className="font-bold text-swiggy-dark text-base mb-3">
          Available orders {availableOrders.length > 0 && <span className="text-swiggy-orange">({availableOrders.length})</span>}
        </h2>
        {availableOrders.length === 0 ? (
          <div className="text-center py-12 text-swiggy-gray-dark">
            <FiTruck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No orders available right now</p>
            <p className="text-sm mt-1">Stay online to receive orders</p>
          </div>
        ) : (
          availableOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-card p-4 mb-3 border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-swiggy-dark">{order.restaurant_name || "Domino's Pizza"}</p>
                  <p className="text-xs text-swiggy-gray-dark mt-0.5">#{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-swiggy-green text-lg">₹{order.worker_earning || 60}</p>
                  <p className="text-xs text-swiggy-gray-dark">{order.estimated_distance_km || 4.2}km · {order.estimated_duration_min || 25}min</p>
                </div>
              </div>
              <div className="text-xs text-swiggy-gray-dark space-y-1 mb-3">
                <p>📍 {order.pickup_address || '123 MG Road'}</p>
                <p>📦 {order.delivery_address || '45 Anna Nagar'}</p>
              </div>
              <button onClick={() => acceptOrder(order.id)}
                className="w-full bg-swiggy-orange text-white font-bold py-2.5 rounded-lg hover:bg-swiggy-orange-dark transition-colors">
                Accept Order
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
