import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orderAPI } from '../../services/api'

export default function OrderHistory() {
  const [orders, setOrders] = useState([])
  useEffect(() => { orderAPI.getMyOrders().then(r => setOrders(r.data.orders||[])).catch(() => setOrders(MOCK)) }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Your Orders</h1>
      {orders.map(o => (
        <div key={o.id} className="bg-white rounded-xl shadow-card p-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-swiggy-dark">{o.restaurant_name}</p>
              <p className="text-xs text-swiggy-gray-dark mt-0.5">{o.order_number}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${o.status==='delivered'?'bg-green-50 text-green-700':o.status==='failed'?'bg-red-50 text-red-700':'bg-orange-50 text-swiggy-orange'}`}>{o.status}</span>
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-bold text-swiggy-dark">₹{o.total_amount}</span>
            {(o.status === 'delivering' || o.status === 'assigned') && (
              <Link to={`/order/${o.id}/track`} className="text-xs bg-swiggy-orange text-white px-3 py-1.5 rounded-lg font-medium">Track Order</Link>
            )}
            {o.status === 'delivered' && (
              <button className="text-xs border border-swiggy-orange text-swiggy-orange px-3 py-1.5 rounded-lg font-medium">Reorder</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
const MOCK = [
  { id:'1', order_number:'ORD-4521', restaurant_name:"Domino's Pizza", status:'delivered', total_amount:678 },
  { id:'2', order_number:'ORD-4498', restaurant_name:'Biryani Blues', status:'delivered', total_amount:420 },
]
