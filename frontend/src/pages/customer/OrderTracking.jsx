import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { FiPhone, FiMessageSquare, FiCheckCircle, FiClock } from 'react-icons/fi'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { orderAPI } from '../../services/api'
import { connectSocket, subscribeToOrder, disconnectSocket } from '../../services/socket'
import MapRecenter from '../../components/common/MapRecenter'

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

const STEPS = [
  { key: 'placed', label: 'Order placed', desc: 'Your order has been placed' },
  { key: 'confirmed', label: 'Order confirmed', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', desc: 'Restaurant is preparing your food' },
  { key: 'picked_up', label: 'Picked up', desc: 'Delivery partner picked up your order' },
  { key: 'delivering', label: 'On the way', desc: 'Your order is on the way' },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' },
]

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [workerLocation, setWorkerLocation] = useState({ lat: 12.9716, lng: 77.5946 }) // Default Bangalore
  const [eta, setEta] = useState('25-30 min')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await orderAPI.getTracking(id)
        setOrder(res.data)
        if (res.data.worker_lat) setWorkerLocation({ lat: res.data.worker_lat, lng: res.data.worker_lng })
      } catch {
        setOrder(MOCK_ORDER)
      }
    }
    fetchOrder()

    const socket = connectSocket()
    const unsub = subscribeToOrder(id,
      (loc) => setWorkerLocation(loc),
      (status) => setOrder((o) => ({ ...o, status }))
    )
    return () => { unsub?.(); disconnectSocket() }
  }, [id])

  const currentStepIdx = STEPS.findIndex((s) => s.key === (order?.status || 'preparing'))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-swiggy-green text-white rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Estimated delivery</p>
            <p className="text-2xl font-bold mt-1">{eta}</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-sm">Order #{order?.order_number || 'ORD-4521'}</p>
            <p className="text-sm font-medium mt-1">{order?.restaurant_name || "Domino's Pizza"}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-gray-100 rounded-xl h-64 mb-6 relative overflow-hidden border border-gray-200">
        <MapContainer center={[workerLocation.lat, workerLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter lat={workerLocation.lat} lng={workerLocation.lng} />
          <Marker position={[workerLocation.lat, workerLocation.lng]} icon={workerIcon}>
            <Popup>
              <p className="text-xs font-bold">Your delivery partner is here</p>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Order Status Steps */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <h2 className="font-bold text-swiggy-dark mb-4">Order status</h2>
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const done = idx <= currentStepIdx
            const active = idx === currentStepIdx
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-swiggy-green' : 'bg-gray-200'} ${active ? 'ring-2 ring-swiggy-green ring-offset-2' : ''}`}>
                    {done && <FiCheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  {idx < STEPS.length - 1 && <div className={`w-0.5 h-6 mt-1 ${done && idx < currentStepIdx ? 'bg-swiggy-green' : 'bg-gray-200'}`} />}
                </div>
                <div className="pb-2">
                  <p className={`text-sm font-medium ${done ? 'text-swiggy-dark' : 'text-gray-400'}`}>{step.label}</p>
                  {active && <p className="text-xs text-swiggy-gray-dark mt-0.5">{step.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Delivery Partner Card */}
      {currentStepIdx >= 3 && (
        <div className="bg-white rounded-xl shadow-card p-5 mb-6">
          <h2 className="font-bold text-swiggy-dark mb-3">Your delivery partner</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-swiggy-orange-light rounded-full flex items-center justify-center text-xl font-bold text-swiggy-orange">
              {(order?.worker_name || 'Ravi Kumar').charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-swiggy-dark">{order?.worker_name || 'Ravi Kumar'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs bg-swiggy-green text-white px-1.5 py-0.5 rounded font-bold">★ 4.8</span>
                <span className="text-xs text-swiggy-gray-dark ml-1">On motorcycle</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${order?.worker_phone || ''}`}
                className="w-10 h-10 bg-swiggy-green rounded-full flex items-center justify-center text-white hover:opacity-90">
                <FiPhone className="w-4 h-4" />
              </a>
              <button className="w-10 h-10 bg-swiggy-orange rounded-full flex items-center justify-center text-white hover:opacity-90">
                <FiMessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-xl shadow-card p-5">
        <h2 className="font-bold text-swiggy-dark mb-3">Order details</h2>
        {(order?.items || MOCK_ORDER.items).map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1.5">
            <span className="text-swiggy-dark">{item.quantity}x {item.name}</span>
            <span className="font-medium">₹{item.total_price}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-swiggy-gray-dark">Subtotal</span><span>₹{order?.subtotal || 649}</span></div>
          <div className="flex justify-between text-sm"><span className="text-swiggy-gray-dark">Delivery fee</span><span>₹{order?.delivery_fee || 29}</span></div>
          <div className="flex justify-between text-sm font-bold text-swiggy-dark pt-1 border-t border-gray-100">
            <span>Total</span><span>₹{order?.total_amount || 678}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const MOCK_ORDER = {
  order_number: 'ORD-4521',
  status: 'delivering',
  restaurant_name: "Domino's Pizza",
  worker_name: 'Ravi Kumar',
  subtotal: 649,
  delivery_fee: 29,
  total_amount: 678,
  items: [
    { id: 'i1', name: 'Margherita Pizza', quantity: 1, total_price: 249 },
    { id: 'i2', name: 'Farmhouse Pizza', quantity: 1, total_price: 329 },
    { id: 'i6', name: 'Garlic Bread', quantity: 1, total_price: 99 },
  ]
}
