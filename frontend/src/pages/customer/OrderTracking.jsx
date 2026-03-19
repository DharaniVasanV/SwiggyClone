import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FiAlertCircle, FiCheckCircle, FiClock, FiPhone } from 'react-icons/fi'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import toast from 'react-hot-toast'
import { orderAPI } from '../../services/api'
import { connectSocket, subscribeToOrder } from '../../services/socket'
import MapRecenter from '../../components/common/MapRecenter'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = defaultIcon

const workerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: '<div class="w-6 h-6 bg-swiggy-orange rounded-full pulse-orange border-2 border-white"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const STEPS = [
  { key: 'placed', label: 'Order placed', desc: 'Your order has been placed' },
  { key: 'ready', label: 'Ready for pickup', desc: 'Your order is ready and waiting for a delivery partner' },
  { key: 'confirmed', label: 'Order confirmed', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', desc: 'Restaurant is preparing your food' },
  { key: 'picked_up', label: 'Picked up', desc: 'Delivery partner picked up your order' },
  { key: 'delivering', label: 'On the way', desc: 'Your order is on the way' },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' }
]

const geocodeAddress = async (address) => {
  if (!address) return null
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {}
  return null
}

const haversineKm = (a, b) => {
  if (!a || !b) return null
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h))
}

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [workerLocation, setWorkerLocation] = useState(null)
  const [etaText, setEtaText] = useState('25-30 min')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderAPI.getTracking(id)
        setOrder(res.data)
        if (res.data.worker_lat) {
          setWorkerLocation({ lat: res.data.worker_lat, lng: res.data.worker_lng })
        }
      } catch {
        setError('Could not load order tracking details')
        toast.error('Failed to load real-time tracking')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()

    connectSocket()
    const unsub = subscribeToOrder(
      id,
      (loc) => setWorkerLocation(loc),
      (statusUpdate) => {
        setOrder((current) => ({ ...current, ...statusUpdate }))
        if (statusUpdate.status === 'failed') {
          toast.error(`Delivery failed: ${statusUpdate.reason?.replace(/_/g, ' ') || 'Unable to deliver'}`, { duration: 6000 })
        } else if (statusUpdate.status) {
          toast.success(`Order status: ${statusUpdate.status.replace('_', ' ')}`)
        }
      }
    )

    return () => unsub?.()
  }, [id])

  useEffect(() => {
    const updateEta = async () => {
      if (!order || !workerLocation || order.status === 'delivered') {
        setEtaText(order?.status === 'delivered' ? 'Completed' : '25-30 min')
        return
      }

      let target = null
      if (['picked_up', 'delivering'].includes(order.status)) {
        target = await geocodeAddress(order.delivery_address)
      } else if (order.pickup_lat && order.pickup_lng) {
        target = { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }
      } else {
        target = await geocodeAddress(order.restaurant_address || order.pickup_address)
      }

      const distanceKm = haversineKm(workerLocation, target)
      if (!Number.isFinite(distanceKm)) {
        setEtaText('25-30 min')
        return
      }

      const travelMinutes = Math.max(5, Math.round((distanceKm / 25) * 60) + 3)
      setEtaText(`${travelMinutes}-${travelMinutes + 5} min`)
    }

    updateEta()
  }, [order, workerLocation])

  if (loading) return <div className="py-20 text-center text-swiggy-gray-dark">Fetching live tracking...</div>

  if (error || !order) {
    return (
      <div className="py-20 text-center text-swiggy-gray-dark px-4">
        <FiAlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="font-bold text-lg text-swiggy-dark">{error || 'Order not found'}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-swiggy-orange font-bold">Try again</button>
      </div>
    )
  }

  const currentStepIdx = STEPS.findIndex((step) => step.key === (order?.status || 'placed'))

  if (order?.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-red-500 text-white rounded-xl p-5 mb-6 text-center">
          <FiAlertCircle className="w-10 h-10 mx-auto mb-2" />
          <p className="text-xl font-bold">Delivery Failed</p>
          <p className="text-sm mt-1 opacity-90">{order.failure_reason?.replace(/_/g, ' ') || 'Unable to complete delivery'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5 text-center">
          <p className="text-swiggy-gray-dark text-sm">We apologize for the inconvenience. Please contact support or reorder.</p>
          <p className="text-xs text-swiggy-gray-dark mt-2">Order #{order.order_number}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className={`${order.status === 'delivered' ? 'bg-swiggy-green' : 'bg-swiggy-dark'} text-white rounded-xl p-5 mb-6 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 text-sm">
              {order.status === 'delivered' ? 'Delivered at' : 'Estimated delivery'}
            </p>
            <p className="text-2xl font-bold mt-1">
              {order.status === 'delivered' ? 'Completed' : etaText}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-300 text-sm">Order #{order.order_number}</p>
            <p className="text-sm font-medium mt-1 truncate max-w-[150px]">{order.restaurant_name}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl h-72 mb-6 relative overflow-hidden border border-gray-200 shadow-inner">
        {workerLocation ? (
          <MapContainer center={[workerLocation.lat, workerLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapRecenter lat={workerLocation.lat} lng={workerLocation.lng} />
            <Marker position={[workerLocation.lat, workerLocation.lng]} icon={workerIcon}>
              <Popup>
                <p className="text-xs font-bold">Your delivery partner</p>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-swiggy-gray-dark flex-col">
            <FiClock className="w-8 h-8 mb-2 animate-spin-slow" />
            <p className="text-sm px-10 text-center">Waiting for delivery partner to start GPS...</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <h2 className="font-bold text-swiggy-dark mb-4 text-lg">Track your order</h2>
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const done = idx <= currentStepIdx
            const active = idx === currentStepIdx
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${done ? 'bg-swiggy-green' : 'bg-gray-200'}`}>
                    {done ? <FiCheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  {idx < STEPS.length - 1 && <div className={`w-[2px] h-8 mt-1 ${done && idx < currentStepIdx ? 'bg-swiggy-green' : 'bg-gray-200'}`} />}
                </div>
                <div className="pb-4">
                  <p className={`text-base font-semibold ${active ? 'text-swiggy-orange' : done ? 'text-swiggy-dark' : 'text-gray-400'}`}>{step.label}</p>
                  {active && <p className="text-sm text-swiggy-gray-dark mt-0.5">{step.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {order.worker_name && (
        <div className="bg-white rounded-xl shadow-card p-5 mb-6 border-l-4 border-swiggy-orange">
          <h2 className="font-bold text-swiggy-dark mb-3">Delivery Partner</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-swiggy-orange-light rounded-full flex items-center justify-center text-2xl font-bold text-swiggy-orange">
              {order.worker_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-swiggy-dark text-lg">{order.worker_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs bg-swiggy-green text-white px-1.5 py-0.5 rounded font-bold">Rating {Number(order.worker_rating || 0).toFixed(1)}</span>
                <span className="text-xs text-swiggy-gray-dark ml-2">Verification Verified</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${order.worker_phone || ''}`}
                className="w-12 h-12 bg-swiggy-green rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-100"
              >
                <FiPhone className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-bold text-swiggy-dark mb-3 text-lg">Order Summary</h2>
        {(order.items || []).map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
            <span className="text-swiggy-dark">{item.quantity}x {item.name}</span>
            <span className="font-semibold text-swiggy-dark font-mono text-xs">Rs {item.total_price}</span>
          </div>
        ))}
        <div className="mt-4 space-y-2 pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm text-swiggy-gray-dark">
            <span>Subtotal</span>
            <span>Rs {order.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-swiggy-gray-dark">
            <span>Delivery Fee</span>
            <span>Rs {order.delivery_fee}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-swiggy-dark pt-2 mt-2 border-t border-swiggy-dark/5">
            <span>Total bill</span>
            <span className="text-swiggy-orange">Rs {order.total_amount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
