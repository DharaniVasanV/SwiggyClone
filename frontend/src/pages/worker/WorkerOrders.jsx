import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { workerAPI } from '../../services/api'
import { FiMapPin, FiClock, FiDollarSign } from 'react-icons/fi'

const STATUS_STYLES = {
  delivered: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  delivering: 'bg-blue-50 text-blue-700',
  assigned: 'bg-orange-50 text-swiggy-orange',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function WorkerOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    workerAPI.getMyOrders()
      .then(r => setOrders(r.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-4">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all','delivered','delivering','failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-swiggy-orange text-white' : 'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="shimmer h-28 rounded-xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-swiggy-gray-dark">
          <p className="font-medium">No orders found</p>
        </div>
      ) : filtered.map(o => (
        <div key={o.id} className="bg-white rounded-xl shadow-card p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-swiggy-dark">{o.order_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
          </div>
          <p className="text-xs font-medium text-swiggy-dark mb-1">{o.restaurant_name}</p>
          <div className="flex items-center gap-1 text-xs text-swiggy-gray-dark mb-1">
            <FiMapPin className="w-3 h-3"/> {o.delivery_address}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <div className="flex gap-4 text-xs text-swiggy-gray-dark">
              <span className="flex items-center gap-1"><FiClock className="w-3 h-3"/>{o.duration || 28} min</span>
              <span>{o.distance || 4.2} km</span>
            </div>
            <span className="text-sm font-bold text-swiggy-green flex items-center gap-1">
              <FiDollarSign className="w-3 h-3"/>₹{o.worker_earning || 65}
            </span>
          </div>
          {(o.status === 'assigned' || o.status === 'delivering') && (
            <Link to={`/worker/delivery/${o.id}`}
              className="block mt-2 text-center text-xs text-swiggy-orange font-medium border border-swiggy-orange rounded-lg py-1.5 hover:bg-swiggy-orange-light">
              Continue delivery →
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

