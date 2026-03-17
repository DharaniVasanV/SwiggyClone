import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiUsers, FiPackage, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { adminAPI } from '../../services/api'
import { connectSocket, subscribeToLiveWorkers } from '../../services/socket'
import 'leaflet/dist/leaflet.css'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] })

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liveWorkers, setLiveWorkers] = useState([])

  useEffect(() => {
    adminAPI.getDashboard()
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to fetch dashboard data'))
      .finally(() => setLoading(false))

    adminAPI.getLiveWorkers().then(r => setLiveWorkers(r.data.workers || [])).catch(() => {})

    connectSocket()
    const unsub = subscribeToLiveWorkers(update => {
      setLiveWorkers(prev => {
        const idx = prev.findIndex(w => w.id === update.worker_id)
        if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...update }; return n }
        return [...prev, { id: update.worker_id, ...update }]
      })
    })
    return () => unsub?.()
  }, [])

  const workerIcon = (status) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${status === 'delivering' ? '#FC8019' : '#60b246'}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5]
  })

  if (loading) return <div className="py-20 text-center text-swiggy-gray-dark">Loading dashboard...</div>
  if (error) return <div className="py-20 text-center text-red-500">{error}</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-swiggy-dark">Admin Dashboard</h1>
          <p className="text-swiggy-gray-dark text-sm mt-1">Platform overview · {new Date().toDateString()}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: <FiUsers />, label: 'Total Workers', value: data.total_workers, change: `${data.pending_verification || 0} pending verification`, color: 'bg-blue-50 text-blue-600' },
          { icon: <FiTrendingUp />, label: 'Active Workers', value: data.active_workers, change: 'Online now', color: 'bg-green-50 text-green-600' },
          { icon: <FiPackage />, label: 'Orders Today', value: data.orders_today?.toLocaleString(), change: `${data.success_rate}% success rate`, color: 'bg-orange-50 text-swiggy-orange' },
          { icon: <FiAlertTriangle />, label: 'Failed Deliveries', value: data.failed_today, change: 'Requires attention', color: 'bg-red-50 text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 ${s.color}`}>{s.icon}</div>
            <div className="text-2xl font-bold text-swiggy-dark">{s.value ?? '—'}</div>
            <div className="text-xs text-swiggy-gray-dark mt-1">{s.label}</div>
            <div className="text-xs text-swiggy-green mt-1">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top Workers */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-swiggy-dark">Top workers today</h2>
            <Link to="/admin/workers" className="text-xs text-swiggy-orange">View all →</Link>
          </div>
          <div className="space-y-3">
            {data.top_workers?.length > 0 ? data.top_workers.map((w, i) => (
              <div key={w.id || i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-swiggy-orange-light text-swiggy-orange flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {w.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-swiggy-dark truncate">{w.name}</p>
                  <p className="text-xs text-swiggy-gray-dark">{w.orders} orders · {Number(w.distance || 0).toFixed(1)}km</p>
                </div>
                <div className="text-sm font-bold text-swiggy-green">₹{w.earnings}</div>
              </div>
            )) : (
              <p className="text-sm text-swiggy-gray-dark text-center py-4">No deliveries yet today</p>
            )}
          </div>
        </div>

        {/* Recent Failures */}
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-swiggy-dark">Recent delivery failures</h2>
            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">{data.failed_today} today</span>
          </div>
          <div className="space-y-3">
            {data.recent_failures?.length > 0 ? data.recent_failures.map((f, i) => (
              <div key={f.id || i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-swiggy-dark">{f.worker_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">{f.reason}</span>
                </div>
                <div className="text-xs text-swiggy-gray-dark">{f.time}</div>
              </div>
            )) : (
              <p className="text-sm text-swiggy-gray-dark text-center py-4">No failures recorded</p>
            )}
          </div>
        </div>
      </div>

      {/* Live tracking preview */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-swiggy-dark">Live Delivery Partners</h2>
          <Link to="/admin/live-map" className="text-xs text-swiggy-orange font-medium hover:underline">Full-screen Map →</Link>
        </div>
        <div className="h-80 rounded-xl overflow-hidden border border-gray-100 relative z-0">
          <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {liveWorkers.map(w => (
              <Marker key={w.id} position={[w.current_lat || 13.0827, w.current_lng || 80.2707]} icon={workerIcon(w.current_status)}>
                <Popup><span className="text-xs font-bold">{w.name || 'Worker'}</span></Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute top-4 right-4 z-10">
            <Link to="/admin/live-map" className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-swiggy-dark shadow-md hover:text-swiggy-orange">Open Console</Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Live Tracking Console', desc: 'Real-time GPS monitor', link: '/admin/live-map', color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Orders & Disputes', desc: 'Management hub', link: '/admin/orders', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Performance Analytics', desc: 'Efficiency insights', link: '/admin/analytics', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        ].map((item) => (
          <Link key={item.label} to={item.link} className={`border rounded-xl p-4 hover:shadow-md transition-shadow ${item.color}`}>
            <p className="font-bold text-sm">{item.label}</p>
            <p className="text-xs opacity-70 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
