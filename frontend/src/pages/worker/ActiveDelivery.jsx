import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { workerAPI } from '../../services/api'
import { emitWorkerLocation } from '../../services/socket'
import { FiCheckCircle, FiAlertTriangle, FiPhone, FiNavigation } from 'react-icons/fi'
import MapRecenter from '../../components/common/MapRecenter'
import toast from 'react-hot-toast'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] })

const workerIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#FC8019;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10]
})

const destIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#60b246;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10]
})

const FAILURE_REASONS = ['road_blockage', 'vehicle_breakdown', 'customer_unavailable', 'weather', 'other']

// Geocode address using Nominatim (free, no API key)
const geocodeAddress = async (address) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {}
  return null
}

export default function ActiveDelivery() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [workerLocation, setWorkerLocation] = useState(null)
  const [destLocation, setDestLocation] = useState(null)
  const [showFailure, setShowFailure] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const [failureDesc, setFailureDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    workerAPI.getOrder(orderId)
      .then(async r => {
        const o = r.data
        setOrder(o)

        // Use stored coords if available, else geocode delivery address
        if (o.delivery_lat && o.delivery_lng) {
          setDestLocation({ lat: parseFloat(o.delivery_lat), lng: parseFloat(o.delivery_lng) })
        } else if (o.delivery_address) {
          const coords = await geocodeAddress(o.delivery_address)
          if (coords) setDestLocation(coords)
        }
      })
      .catch(() => toast.error('Failed to load order'))

    // GPS tracking
    let gpsInterval
    if (navigator.geolocation) {
      const tick = () => navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng, speed } = pos.coords
        setWorkerLocation({ lat, lng })
        emitWorkerLocation(lat, lng, orderId, speed || 0)
        workerAPI.updateLocation(lat, lng, speed || 0).catch(() => {})
      })
      tick()
      gpsInterval = setInterval(tick, 5000)
    }
    return () => clearInterval(gpsInterval)
  }, [orderId])

  const updateStatus = async (status) => {
    try {
      await workerAPI.updateOrderStatus(orderId, status, {})
      toast.success(status === 'delivered' ? 'Delivery completed! 🎉' : 'Status updated')
      if (status === 'delivered') navigate('/worker')
    } catch { toast.error('Failed to update status') }
  }

  const reportFailure = async () => {
    if (!failureReason) { toast.error('Select a reason'); return }
    setSubmitting(true)
    const submit = async (lat, lng) => {
      try {
        await workerAPI.reportFailure(orderId, { reason: failureReason, description: failureDesc, lat, lng })
        toast.success('Failure reported. Customer has been notified.')
        navigate('/worker')
      } catch { toast.error('Failed to report') }
      finally { setSubmitting(false) }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => submit(pos.coords.latitude, pos.coords.longitude),
        () => submit(null, null)
      )
    } else { submit(null, null) }
  }

  const mapCenter = workerLocation || destLocation || { lat: 11.0168, lng: 76.9558 }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-swiggy-dark">Order #{order?.order_number || '...'}</h1>
          <p className="text-xs text-swiggy-gray-dark">Delivery in progress</p>
        </div>
        {order?.customer_phone && (
          <a href={`tel:${order.customer_phone}`}
            className="flex items-center gap-2 bg-swiggy-green text-white px-4 py-2 rounded-xl font-bold text-sm shadow">
            <FiPhone className="w-4 h-4" /> Call Customer
          </a>
        )}
      </div>

      {/* Map with worker + destination */}
      <div className="rounded-xl h-64 mb-4 overflow-hidden border border-gray-200 relative">
        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {workerLocation && (
            <>
              <MapRecenter lat={workerLocation.lat} lng={workerLocation.lng} />
              <Marker position={[workerLocation.lat, workerLocation.lng]} icon={workerIcon}>
                <Popup><span className="text-xs font-bold">You</span></Popup>
              </Marker>
            </>
          )}
          {destLocation && (
            <Marker position={[destLocation.lat, destLocation.lng]} icon={destIcon}>
              <Popup><span className="text-xs font-bold">Deliver here</span><br/><span className="text-xs">{order?.delivery_address}</span></Popup>
            </Marker>
          )}
        </MapContainer>
        {order?.delivery_address && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address)}`}
            target="_blank" rel="noreferrer"
            className="absolute bottom-3 right-3 z-[999] bg-white text-swiggy-orange font-bold text-xs px-3 py-1.5 rounded-lg shadow flex items-center gap-1">
            <FiNavigation className="w-3 h-3" /> Navigate
          </a>
        )}
      </div>

      {/* Route info + customer contact */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4 space-y-3">
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-swiggy-orange">P</div>
          <div>
            <p className="text-xs text-swiggy-gray-dark">Pick up from</p>
            <p className="text-sm font-medium text-swiggy-dark">{order?.pickup_address || '—'}</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-swiggy-green">D</div>
          <div>
            <p className="text-xs text-swiggy-gray-dark">Deliver to</p>
            <p className="text-sm font-medium text-swiggy-dark">{order?.delivery_address || '—'}</p>
          </div>
        </div>
        {order?.customer_name && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-swiggy-gray-dark">Customer</p>
              <p className="text-sm font-medium text-swiggy-dark">{order.customer_name}</p>
            </div>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`}
                className="flex items-center gap-1.5 text-swiggy-green font-bold text-sm border border-swiggy-green px-3 py-1.5 rounded-lg">
                <FiPhone className="w-3.5 h-3.5" /> {order.customer_phone}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 mb-3">
        <button onClick={() => updateStatus('picked_up')}
          className="w-full bg-swiggy-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <FiCheckCircle /> Picked up — heading to customer
        </button>
        <button onClick={() => updateStatus('delivered')}
          className="w-full bg-swiggy-green text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <FiCheckCircle /> Delivered successfully
        </button>
        <button onClick={() => setShowFailure(!showFailure)}
          className="w-full border border-red-300 text-red-500 font-medium py-3 rounded-xl flex items-center justify-center gap-2">
          <FiAlertTriangle /> Report delivery failure
        </button>
      </div>

      {showFailure && (
        <div className="bg-white rounded-xl shadow-card p-4">
          <h3 className="font-bold text-swiggy-dark text-sm mb-3">Why couldn't you deliver?</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {FAILURE_REASONS.map(r => (
              <button key={r} onClick={() => setFailureReason(r)}
                className={`text-xs p-2 rounded-lg border capitalize text-left transition-colors ${failureReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-swiggy-gray-dark'}`}>
                {r.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <textarea rows={2} className="w-full border border-gray-200 rounded-lg p-2 text-xs resize-none mb-3 focus:outline-none focus:border-swiggy-orange"
            placeholder="Additional details..." value={failureDesc} onChange={e => setFailureDesc(e.target.value)} />
          <button onClick={reportFailure} disabled={submitting}
            className="w-full bg-red-500 text-white font-bold py-2.5 rounded-lg disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit & Notify Customer'}
          </button>
        </div>
      )}
    </div>
  )
}
