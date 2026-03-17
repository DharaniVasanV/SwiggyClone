import { useState } from 'react'
import { insuranceAPI } from '../../services/api'
import { FiDownload, FiDatabase, FiActivity, FiCloud, FiAlertTriangle, FiUser } from 'react-icons/fi'
import toast from 'react-hot-toast'

const ENDPOINTS = [
  {
    icon: <FiUser className="w-5 h-5" />,
    title: 'Worker Profiles',
    desc: 'Name, vehicle, experience, verification status, join date',
    endpoint: 'GET /api/insurance/workers',
    fields: ['worker_id', 'name', 'vehicle_type', 'experience_years', 'verification_status', 'zone', 'total_deliveries', 'rating'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    fn: () => insuranceAPI.getWorkers(),
  },
  {
    icon: <FiActivity className="w-5 h-5" />,
    title: 'Delivery Records',
    desc: 'Every delivery with GPS route, distance, duration, earnings',
    endpoint: 'GET /api/insurance/deliveries',
    fields: ['order_id', 'worker_id', 'pickup_lat', 'pickup_lng', 'delivery_lat', 'delivery_lng', 'distance_km', 'duration_min', 'worker_earning', 'status', 'timestamp'],
    color: 'bg-green-50 text-green-700 border-green-200',
    fn: () => insuranceAPI.getDeliveries(),
  },
  {
    icon: <FiCloud className="w-5 h-5" />,
    title: 'Environmental Data',
    desc: 'Weather, AQI, rainfall captured at time of each delivery',
    endpoint: 'GET /api/insurance/environment',
    fields: ['order_id', 'worker_id', 'temperature', 'rainfall_mm_per_hour', 'aqi', 'pm25', 'wind_speed', 'weather_condition', 'visibility_km', 'recorded_at'],
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    fn: () => insuranceAPI.getEnvironmentLogs(),
  },
  {
    icon: <FiAlertTriangle className="w-5 h-5" />,
    title: 'Delivery Failures',
    desc: 'Failed deliveries with reason, location, conditions — key for parametric triggers',
    endpoint: 'GET /api/insurance/failures',
    fields: ['order_id', 'worker_id', 'reason', 'worker_lat_at_failure', 'worker_lng_at_failure', 'aqi_at_failure', 'rainfall_at_failure', 'weather_at_failure', 'reported_at'],
    color: 'bg-red-50 text-red-700 border-red-200',
    fn: () => insuranceAPI.getFailures(),
  },
  {
    icon: <FiDatabase className="w-5 h-5" />,
    title: 'Worker Earnings Stats',
    desc: 'Daily/weekly/monthly income per worker for income protection modelling',
    endpoint: 'GET /api/insurance/workers/:id/stats',
    fields: ['worker_id', 'daily_avg_earnings', 'weekly_earnings', 'monthly_earnings', 'avg_per_order', 'active_days', 'peak_hours'],
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    fn: () => insuranceAPI.getWorkers(),
  },
]

export default function AdminInsuranceExport() {
  const [loading, setLoading] = useState({})
  const [preview, setPreview] = useState(null)
  const [exporting, setExporting] = useState(false)

  const fetchPreview = async (ep) => {
    setLoading((l) => ({ ...l, [ep.title]: true }))
    try {
      const res = await ep.fn()
      setPreview({ title: ep.title, data: res.data })
    } catch {
      setPreview({ title: ep.title, data: { sample: 'Connect backend to see live data', fields: ep.fields } })
    } finally {
      setLoading((l) => ({ ...l, [ep.title]: false }))
    }
  }

  const exportAll = async (format) => {
    setExporting(true)
    try {
      const res = await insuranceAPI.exportData(format)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `swiggy-insurance-data-${Date.now()}.${format}`
      a.click()
      toast.success(`Exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed — ensure backend is running')
    } finally { setExporting(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-swiggy-dark">Insurance Data Export</h1>
        <p className="text-swiggy-gray-dark text-sm mt-1">All data collected from the platform, structured for your AI parametric insurance model</p>
      </div>

      {/* API Key Info */}
      <div className="bg-swiggy-dark text-white rounded-xl p-5 mb-6">
        <p className="text-sm text-gray-300 mb-2">API Authentication</p>
        <code className="text-swiggy-orange text-sm">
          Authorization: Bearer {'<INSURANCE_API_KEY>'}
        </code>
        <p className="text-xs text-gray-400 mt-2">Set INSURANCE_API_KEY in backend .env · All endpoints return JSON · Rate limit: 100 req/min</p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => exportAll('json')} disabled={exporting}
            className="flex items-center gap-2 bg-swiggy-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-swiggy-orange-dark disabled:opacity-50">
            <FiDownload className="w-4 h-4" /> Export all as JSON
          </button>
          <button onClick={() => exportAll('csv')} disabled={exporting}
            className="flex items-center gap-2 border border-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:border-white disabled:opacity-50">
            <FiDownload className="w-4 h-4" /> Export all as CSV
          </button>
        </div>
      </div>

      {/* Data Endpoints */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {ENDPOINTS.map((ep) => (
          <div key={ep.title} className={`border rounded-xl p-4 ${ep.color}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="mt-0.5 flex-shrink-0">{ep.icon}</div>
              <div>
                <h3 className="font-bold text-sm">{ep.title}</h3>
                <p className="text-xs opacity-80 mt-0.5">{ep.desc}</p>
              </div>
            </div>
            <code className="block text-xs bg-white/60 rounded px-2 py-1 mb-2 font-mono">{ep.endpoint}</code>
            <div className="flex flex-wrap gap-1 mb-3">
              {ep.fields.slice(0, 5).map((f) => (
                <span key={f} className="text-xs bg-white/40 px-1.5 py-0.5 rounded font-mono">{f}</span>
              ))}
              {ep.fields.length > 5 && <span className="text-xs opacity-70">+{ep.fields.length - 5} more</span>}
            </div>
            <button onClick={() => fetchPreview(ep)} disabled={loading[ep.title]}
              className="text-xs font-medium underline opacity-80 hover:opacity-100 disabled:opacity-40">
              {loading[ep.title] ? 'Fetching...' : 'Preview response →'}
            </button>
          </div>
        ))}
      </div>

      {/* Parametric Insurance Info */}
      <div className="bg-swiggy-orange-light border border-orange-200 rounded-xl p-5 mb-6">
        <h2 className="font-bold text-swiggy-dark mb-3">How this data feeds your AI insurance model</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-swiggy-dark mb-1">Parametric triggers</p>
            <p className="text-swiggy-gray-dark text-xs">When AQI {'>'} 300 OR rainfall {'>'} 50mm/h → automatic claim trigger. All condition data is stored per delivery.</p>
          </div>
          <div>
            <p className="font-semibold text-swiggy-dark mb-1">Income baseline</p>
            <p className="text-swiggy-gray-dark text-xs">30-day rolling average earnings per worker forms the insurance payout baseline for income protection.</p>
          </div>
          <div>
            <p className="font-semibold text-swiggy-dark mb-1">Risk zones</p>
            <p className="text-swiggy-gray-dark text-xs">Delivery zone × weather correlation identifies high-risk areas for zone-based premium calculation.</p>
          </div>
        </div>
      </div>

      {/* JSON Preview */}
      {preview && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-swiggy-dark">Preview: {preview.title}</h3>
            <button onClick={() => setPreview(null)} className="text-xs text-swiggy-gray-dark hover:text-swiggy-dark">✕ Close</button>
          </div>
          <pre className="bg-swiggy-dark text-swiggy-green text-xs rounded-lg p-4 overflow-auto max-h-64 font-mono">
            {JSON.stringify(preview.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
