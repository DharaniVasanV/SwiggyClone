import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiToggleLeft, FiToggleRight, FiTruck, FiDollarSign, FiClock, FiMapPin } from 'react-icons/fi'
import { workerAPI } from '../../services/api'
import { useWorkerStore } from '../../store/workerStore'
import { emitWorkerLocation } from '../../services/socket'
import toast from 'react-hot-toast'

export default function WorkerDashboard() {
  const { 
    status, setStatus, 
    activeOrder, setActiveOrder, 
    availableOrders, setAvailableOrders,
    removeAvailableOrder 
  } = useWorkerStore()
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await workerAPI.getDashboard()
        setStats(res.data.stats)
        setAvailableOrders(res.data.availableOrders || [])
        setActiveOrder(res.data.activeOrder || null)
        // Only set status from DB if we don't have a local override or if it's different
        if (res.data.status) setStatus(res.data.status)
      } catch { 
        toast.error('Failed to fetch dashboard data')
      } finally { 
        setLoading(false) 
      }
    }
    fetchDashboard()
  }, [setAvailableOrders, setActiveOrder, setStatus])

  // GPS tracking ping
  useEffect(() => {
    let gpsInterval
    if (status !== 'offline' && navigator.geolocation) {
      gpsInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          emitWorkerLocation(lat, lng, activeOrder?.id, pos.coords.speed || 0)
          workerAPI.updateLocation(lat, lng, pos.coords.speed || 0).catch(() => {})
        })
      }, 5000)
    }
    return () => clearInterval(gpsInterval)
  }, [status, activeOrder?.id])

  const toggleStatus = async () => {
    const newStatus = status === 'offline' ? 'available' : 'offline'
    try {
      await workerAPI.setStatus(newStatus)
      setStatus(newStatus)
      toast.success(newStatus === 'available' ? 'You are now online!' : 'You are now offline')
    } catch { 
      toast.error('Failed to update status') 
    }
  }

  const acceptOrder = async (orderId) => {
    try {
      const res = await workerAPI.acceptOrder(orderId)
      setActiveOrder(res.data.order)
      removeAvailableOrder(orderId)
      setStatus('delivering')
      toast.success('Order accepted!', { icon: '✅' })
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Failed to accept order') 
    }
  }

  if (loading) return <div className="py-20 text-center text-swiggy-gray-dark">Loading your dashboard...</div>

  return (
    <div className="py-6">
      {/* Status Toggle */}
      <div className="bg-swiggy-dark text-white rounded-xl p-4 mb-5 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-sm text-gray-300">You are currently</p>
          <p className={`text-xl font-bold ${status === 'available' ? 'text-swiggy-green' : status === 'delivering' ? 'text-swiggy-orange' : 'text-gray-400'}`}>
            {status === 'available' ? 'Online' : status === 'delivering' ? 'On Delivery' : 'Offline'}
          </p>
        </div>
        <button onClick={toggleStatus} className="text-4xl transition-transform active:scale-95">
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
        <div className="bg-swiggy-orange text-white rounded-xl p-4 mb-5 shadow-lg animate-pulse-slow">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-base">Active Delivery</span>
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded">#{activeOrder.order_number}</span>
          </div>
          <p className="text-sm font-medium mb-1 line-clamp-1">📍 Pick up: {activeOrder.pickup_address}</p>
          <p className="text-sm font-medium mb-3 line-clamp-1">📦 Deliver to: {activeOrder.delivery_address}</p>
          <Link to={`/worker/delivery/${activeOrder.id}`}
            className="block text-center bg-white text-swiggy-orange font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
            View Delivery Map →
          </Link>
        </div>
      )}

      {/* Available Orders */}
      <div>
        <h2 className="font-bold text-swiggy-dark text-base mb-3 flex items-center gap-2">
          Available orders 
          {availableOrders.length > 0 && (
            <span className="bg-swiggy-orange text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
              {availableOrders.length}
            </span>
          )}
        </h2>
        {availableOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-100 text-swiggy-gray-dark">
            <FiTruck className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">No orders available right now</p>
            <p className="text-sm mt-1">Stay online to receive local orders</p>
          </div>
        ) : (
          availableOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-card p-4 mb-3 border border-gray-100 hover:border-swiggy-orange/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-swiggy-dark text-lg">{order.restaurant_name}</p>
                  <p className="text-xs text-swiggy-gray-dark mt-0.5">Order #{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-swiggy-green text-xl">₹{order.worker_earning}</p>
                  <p className="text-xs text-swiggy-gray-dark">
                    {order.estimated_distance_km ? `${order.estimated_distance_km}km` : 'Local'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-swiggy-gray-dark space-y-2 mb-4 bg-gray-50 p-2 rounded-lg">
                <p className="flex items-start gap-1.5"><span className="text-swiggy-orange mt-0.5">●</span> <b>Pick up:</b> {order.pickup_address}</p>
                <p className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">●</span> <b>Deliver:</b> {order.delivery_address}</p>
              </div>
              <button 
                onClick={() => acceptOrder(order.id)}
                disabled={status === 'delivering'}
                className="w-full bg-swiggy-orange text-white font-bold py-3 rounded-lg hover:bg-swiggy-orange-dark active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-orange"
              >
                Accept Order
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

