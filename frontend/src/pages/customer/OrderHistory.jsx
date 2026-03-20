import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { orderAPI } from '../../services/api'
import { useCartStore } from '../../store/cartStore'

export default function OrderHistory() {
  const navigate = useNavigate()
  const replaceCart = useCartStore((state) => state.replaceCart)
  const [orders, setOrders] = useState([])
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [savingReviewId, setSavingReviewId] = useState(null)

  useEffect(() => {
    orderAPI.getMyOrders().then(r => setOrders(r.data.orders || [])).catch(() => setOrders([]))
  }, [])

  const updateDraft = (orderId, patch) => {
    setReviewDrafts((prev) => ({
      ...prev,
      [orderId]: { rating: prev[orderId]?.rating || '5', comment: prev[orderId]?.comment || '', ...patch }
    }))
  }

  const submitReview = async (orderId) => {
    const draft = reviewDrafts[orderId] || { rating: '5', comment: '' }
    setSavingReviewId(orderId)
    try {
      await orderAPI.submitReview(orderId, {
        rating: Number(draft.rating),
        comment: draft.comment
      })
      setOrders((prev) => prev.map((order) => (
        order.id === orderId
          ? {
              ...order,
              review_submitted: true,
              review: { rating: Number(draft.rating), comment: draft.comment }
            }
          : order
      )))
      toast.success('Review submitted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review')
    } finally {
      setSavingReviewId(null)
    }
  }

  const reorder = (order) => {
    const cartItems = (order.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1)
    }))

    if (!cartItems.length) {
      toast.error('No items found in this order')
      return
    }

    replaceCart(cartItems, order.restaurant_id, order.restaurant_name || 'Restaurant')
    toast.success('Items added back to cart')
    navigate('/checkout')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-5">Your Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-swiggy-gray-dark">
          <p className="font-medium">No orders yet</p>
          <Link to="/" className="text-sm text-swiggy-orange mt-2 inline-block">Order food now -&gt;</Link>
        </div>
      ) : orders.map((o) => (
        <div key={o.id} className="bg-white rounded-xl shadow-card p-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-bold text-swiggy-dark">{o.restaurant_name}</p>
              <p className="text-xs text-swiggy-gray-dark mt-0.5">{o.order_number}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${o.status === 'delivered' ? 'bg-green-50 text-green-700' : o.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-swiggy-orange'}`}>{o.status}</span>
          </div>
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm font-bold text-swiggy-dark">Rs {o.total_amount}</span>
            {['placed', 'ready', 'confirmed', 'preparing', 'assigned', 'picked_up', 'delivering'].includes(o.status) && (
              <Link to={`/order/${o.id}/track`} className="text-xs bg-swiggy-orange text-white px-3 py-1.5 rounded-lg font-medium">Track Order</Link>
            )}
            {o.status === 'delivered' && (
              <button onClick={() => reorder(o)} className="text-xs border border-swiggy-orange text-swiggy-orange px-3 py-1.5 rounded-lg font-medium">Reorder</button>
            )}
          </div>

          {o.status === 'delivered' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {o.review_submitted ? (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-swiggy-dark">Your rating: {o.review?.rating || 0} / 5</p>
                  <p className="text-xs text-swiggy-gray-dark mt-1">{o.review?.comment || 'No written feedback provided.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-swiggy-dark">Rate this restaurant</p>
                  <select
                    className="input-field"
                    value={reviewDrafts[o.id]?.rating || '5'}
                    onChange={(e) => updateDraft(o.id, { rating: e.target.value })}
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Tell others what you liked"
                    value={reviewDrafts[o.id]?.comment || ''}
                    onChange={(e) => updateDraft(o.id, { comment: e.target.value })}
                  />
                  <button
                    onClick={() => submitReview(o.id)}
                    disabled={savingReviewId === o.id}
                    className="btn-orange px-4 py-2 text-sm disabled:opacity-60"
                  >
                    {savingReviewId === o.id ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
