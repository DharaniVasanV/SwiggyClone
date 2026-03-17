import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { workerAPI } from '../../services/api'
import { emitWorkerLocation } from '../../services/socket'
import { FiNavigation, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import toast from 'react-hot-toast'

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const workerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-6 h-6 bg-swiggy-orange rounded-full pulse-orange border-2 border-white"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

import MapRecenter from '../../components/common/MapRecenter'

const FAILURE_REASONS = ['road_blockage','vehicle_breakdown','customer_unavailable','other']

export default function ActiveDelivery() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [showFailure, setShowFailure] = useState(false)
  const [failureReason, setFailureReason] = useState('')
  const [failureDesc, setFailureDesc] = useState('')
  const [location, setLocation] = useState({ lat: 13.0827, lng: 80.2707 }) // Default Chennai

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await workerAPI.getDashboard() // Dashboard includes activeOrder
        if (res.data.activeOrder?.id === orderId) {
          setOrder(res.data.activeOrder)
        } else {
          // Fallback to general order tracking info if not in activeOrder
          // Note: workerAPI.getOrder might be needed if dashboard activeOrder isn't enough
          setOrder(MOCK_ORDER)
        }
      } catch {
        setOrder(MOCK_ORDER)
      }
    }
    fetchOrder()

    // Start sending GPS
    let gpsInterval
    if (navigator.geolocation) {
      gpsInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude, longitude, speed } = pos.coords
          setLocation({ lat: latitude, lng: longitude })
          emitWorkerLocation(latitude, longitude, orderId, speed || 0)
          workerAPI.updateLocation(latitude, longitude, speed || 0).catch(() => {})
        })
      }, 5000)
    }
    return () => clearInterval(gpsInterval)
  }, [orderId])

  const updateStatus = async status => {
    try {
      await workerAPI.updateOrderStatus(orderId, status, {})
      toast.success(status === 'delivered' ? 'Delivery completed! 🎉' : 'Status updated')
      if (status === 'delivered') navigate('/worker')
    } catch { toast.error('Failed to update') }
  }

  const reportFailure = async () => {
    if (!failureReason) { toast.error('Select a reason'); return }
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        await workerAPI.reportFailure(orderId, { reason: failureReason, description: failureDesc, lat: pos.coords.latitude, lng: pos.coords.longitude })
        toast.success('Failure reported')
        navigate('/worker')
      } catch { toast.error('Failed to report') }
    }, () => {
      toast.error('Could not get location')
    })
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-swiggy-dark mb-2">Order #{order?.order_number || 'ORD-XXXX'}</h1>
      <p className="text-sm text-swiggy-gray-dark mb-5">Delivery in progress</p>

      {/* Map */}
      <div className="bg-gray-100 rounded-xl h-56 mb-5 relative overflow-hidden border border-gray-200">
        <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter lat={location.lat} lng={location.lng} />
          <Marker position={[location.lat, location.lng]} icon={workerIcon}>
            <Popup>You are here</Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Route info */}
      <div className="bg-white rounded-xl shadow-card p-4 mb-4 space-y-3">
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-swiggy-orange">P</div>
          <div><p className="text-xs text-swiggy-gray-dark">Pick up from</p><p className="text-sm font-medium text-swiggy-dark">{order?.pickup_address || "Domino's Pizza, MG Road"}</p></div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-swiggy-green">D</div>
          <div><p className="text-xs text-swiggy-gray-dark">Deliver to</p><p className="text-sm font-medium text-swiggy-dark">{order?.delivery_address || '45 Anna Nagar, Chennai'}</p></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button onClick={() => updateStatus('picked_up')} className="w-full bg-swiggy-orange text-white font-bold py-3 rounded-xl hover:bg-swiggy-orange-dark flex items-center justify-center gap-2">
          <FiCheckCircle/> Picked up — heading to customer
        </button>
        <button onClick={() => updateStatus('delivered')} className="w-full bg-swiggy-green text-white font-bold py-3 rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
          <FiCheckCircle/> Delivered successfully
        </button>
        <button onClick={() => setShowFailure(!showFailure)} className="w-full border border-red-300 text-red-500 font-medium py-3 rounded-xl hover:bg-red-50 flex items-center justify-center gap-2">
          <FiAlertTriangle/> Report delivery failure
        </button>
      </div>

      {showFailure && (
        <div className="bg-white rounded-xl shadow-card p-4 mt-3">
          <h3 className="font-bold text-swiggy-dark text-sm mb-3">Why couldn't you deliver?</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {FAILURE_REASONS.map(r => (
              <button key={r} onClick={() => setFailureReason(r)}
                className={`text-xs p-2 rounded-lg border capitalize text-left transition-colors ${failureReason===r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-swiggy-gray-dark'}`}>
                {r.replace(/_/g,' ')}
              </button>
            ))}
          </div>
          <textarea rows={2} className="input-field text-xs resize-none mb-3" placeholder="Additional details..." value={failureDesc} onChange={e => setFailureDesc(e.target.value)}/>
          <button onClick={reportFailure} className="w-full bg-red-500 text-white font-bold py-2.5 rounded-lg hover:opacity-90">Submit Failure Report</button>
        </div>
      )}
    </div>
  )
}

const MOCK_ORDER = { order_number:'ORD-4521', pickup_address:"Domino's Pizza, 123 MG Road", delivery_address:'45 Anna Nagar, Chennai' }
