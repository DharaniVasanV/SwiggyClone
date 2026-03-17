import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { adminAPI } from '../../services/api'
import { connectSocket, subscribeToLiveWorkers } from '../../services/socket'

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

const workerIcon = (status) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${status === 'delivering' ? '#FC8019' : '#60b246'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
})

export default function AdminLiveMap() {
  const [workers, setWorkers] = useState([])
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    adminAPI.getLiveWorkers().then(r => setWorkers(r.data.workers || MOCK_WORKERS)).catch(() => setWorkers(MOCK_WORKERS))
    const socket = connectSocket()
    const unsub = subscribeToLiveWorkers(update => {
      setWorkers(prev => {
        const idx = prev.findIndex(w => w.id === update.worker_id)
        if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...update }; return n }
        return prev
      })
    })
    return () => unsub?.()
  }, [])

  const delivering = workers.filter(w => w.current_status === 'delivering').length
  const available = workers.filter(w => w.current_status === 'available').length

  const center = [13.0827, 80.2707] // Chennai default

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-swiggy-dark">Live Worker Map</h1>
        <div className="flex gap-3 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-swiggy-orange rounded-full inline-block"/> {delivering} delivering</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-swiggy-green rounded-full inline-block"/> {available} available</span>
        </div>
      </div>


      {/* Map */}
      <div className="flex-1 rounded-xl overflow-hidden min-h-72 border border-gray-200">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {workers.map((w, i) => {
             // If no lat/lng, use mock offset from center
             const lat = w.lat || (center[0] + (i * 0.005))
             const lng = w.lng || (center[1] + (i * 0.005))
             return (
               <Marker key={w.id} position={[lat, lng]} icon={workerIcon(w.current_status)}>
                 <Popup>
                   <div className="p-1">
                     <p className="font-bold text-sm">{w.name}</p>
                     <p className="text-xs capitalize">{w.current_status}</p>
                     {w.order_number && <p className="text-xs text-swiggy-orange">Order: {w.order_number}</p>}
                   </div>
                 </Popup>
               </Marker>
             )
          })}
        </MapContainer>
      </div>

      {/* Worker table */}
      <div className="mt-4 bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-xs text-swiggy-gray-dark">
            <th className="text-left px-4 py-2.5">Worker</th>
            <th className="text-left px-4 py-2.5">Vehicle</th>
            <th className="text-left px-4 py-2.5">Status</th>
            <th className="text-left px-4 py-2.5">Order</th>
          </tr></thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-swiggy-dark">{w.name}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark capitalize">{w.vehicle_type || 'motorcycle'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    w.current_status==='delivering' ? 'bg-orange-50 text-swiggy-orange' :
                    w.current_status==='available' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{w.current_status || 'available'}</span>
                </td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{w.order_number || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MOCK_WORKERS = [
  { id: '1', name: 'Ravi Kumar', current_status: 'delivering', vehicle_type: 'motorcycle', order_number: 'ORD-4521' },
  { id: '2', name: 'Meena Patel', current_status: 'delivering', vehicle_type: 'scooter', order_number: 'ORD-4519' },
  { id: '3', name: 'Arjun Singh', current_status: 'available', vehicle_type: 'motorcycle', order_number: null },
  { id: '4', name: 'Priya Devi', current_status: 'available', vehicle_type: 'scooter', order_number: null },
  { id: '5', name: 'Kiran Nair', current_status: 'delivering', vehicle_type: 'bicycle', order_number: 'ORD-4515' },
  { id: '6', name: 'Suresh R.', current_status: 'offline', vehicle_type: 'motorcycle', order_number: null },
]
