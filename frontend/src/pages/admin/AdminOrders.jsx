import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'

const S = { delivered:'bg-green-50 text-green-700', failed:'bg-red-50 text-red-700', delivering:'bg-blue-50 text-blue-700', placed:'bg-gray-100 text-gray-600', cancelled:'bg-gray-100 text-gray-600' }

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    adminAPI.getOrders().then(r => setOrders(r.data.orders||[])).catch(() => setOrders(MOCK)).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Orders</h1>
        <div className="flex gap-2 flex-wrap">
          {['all','placed','delivering','delivered','failed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter===f?'bg-swiggy-orange text-white':'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead><tr className="bg-gray-50 text-xs text-swiggy-gray-dark border-b border-gray-200">
            <th className="text-left px-4 py-3">Order #</th>
            <th className="text-left px-4 py-3">Customer</th>
            <th className="text-left px-4 py-3">Restaurant</th>
            <th className="text-left px-4 py-3">Worker</th>
            <th className="text-left px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Zone</th>
            <th className="text-left px-4 py-3">Time</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-swiggy-dark">{o.order_number}</td>
                <td className="px-4 py-3 text-swiggy-gray-dark">{o.customer_name||'—'}</td>
                <td className="px-4 py-3 text-swiggy-gray-dark">{o.restaurant_name||'—'}</td>
                <td className="px-4 py-3 text-swiggy-gray-dark">{o.worker_name||'Unassigned'}</td>
                <td className="px-4 py-3 font-medium">₹{o.total_amount||0}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${S[o.status]||'bg-gray-100 text-gray-600'}`}>{o.status}</span></td>
                <td className="px-4 py-3 text-swiggy-gray-dark text-xs">{o.delivery_zone||'—'}</td>
                <td className="px-4 py-3 text-swiggy-gray-dark text-xs">{o.created_at ? new Date(o.created_at).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MOCK = [
  { id:'1', order_number:'ORD-4521', customer_name:'John Customer', restaurant_name:"Domino's Pizza", worker_name:'Ravi Kumar', total_amount:678, status:'delivered', delivery_zone:'Zone A', created_at: new Date().toISOString() },
  { id:'2', order_number:'ORD-4519', customer_name:'Jane Doe', restaurant_name:'Biryani Blues', worker_name:'Meena Patel', total_amount:420, status:'delivering', delivery_zone:'Zone B', created_at: new Date().toISOString() },
  { id:'3', order_number:'ORD-4515', customer_name:'Bob Smith', restaurant_name:'KFC', worker_name:'Kiran Nair', total_amount:350, status:'failed', delivery_zone:'Zone C', created_at: new Date().toISOString() },
]
