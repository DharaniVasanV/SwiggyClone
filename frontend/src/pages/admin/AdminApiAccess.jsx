import { useEffect, useMemo, useState } from 'react'
import { FiCopy, FiDatabase, FiKey, FiRefreshCw, FiShield } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'

const ENDPOINTS = [
  {
    title: 'Worker Users',
    endpoint: 'GET /api/external/workers',
    desc: 'Returns only worker records from users, never customers or restaurants.',
    fields: ['id', 'name', 'email', 'phone', 'role', 'is_verified', 'created_at']
  },
  {
    title: 'Worker Profiles',
    endpoint: 'GET /api/external/worker-profiles',
    desc: 'Operational worker profile data such as zone, vehicle, status, and verification.',
    fields: [
      'id', 'user_id', 'vehicle_type', 'zone', 'id_proof_url', 'id_proof_type', 'selfie_url',
      'platform_experience_years', 'verification_status', 'current_status', 'daily_active_ms',
      'current_lat', 'current_lng', 'last_location_update', 'last_online_at', 'total_deliveries',
      'rating', 'created_at', 'verified_at', 'updated_at'
    ]
  },
  {
    title: 'Worker Earnings',
    endpoint: 'GET /api/external/worker-earnings',
    desc: 'Worker earning entries with order-level payout details.',
    fields: [
      'id', 'worker_id', 'order_id', 'zone', 'zone_target_orders', 'incentive_applied',
      'incentive_bonus', 'base_earning', 'total_earning', 'distance_km', 'duration_min', 'earned_at'
    ]
  },
  {
    title: 'Orders',
    endpoint: 'GET /api/external/orders',
    desc: 'Order documents as stored in Firestore for worker and delivery integrations.',
    fields: [
      'id', 'order_number', 'customer_id', 'restaurant_id', 'worker_id', 'status', 'pickup_address',
      'pickup_lat', 'pickup_lng', 'restaurant_zone', 'delivery_address', 'delivery_zone', 'subtotal',
      'delivery_fee', 'total_amount', 'worker_earning', 'items', 'failure_reason', 'assigned_at',
      'picked_up_at', 'delivered_at', 'created_at', 'updated_at'
    ]
  }
]

export default function AdminApiAccess() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [keyInfo, setKeyInfo] = useState({ keys: [], endpoints: [] })
  const [newKey, setNewKey] = useState('')
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [togglingKeyId, setTogglingKeyId] = useState(null)

  const authExamples = useMemo(() => ({
    header: newKey || '<GENERATED_API_KEY>',
    curl: `curl -H "x-api-key: ${newKey || '<GENERATED_API_KEY>'}" "${window.location.origin}/api/external/worker-profiles"`
  }), [newKey])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getExternalAccessKey()
      setKeyInfo({
        keys: res.data.keys || [],
        endpoints: res.data.endpoints || []
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load API access details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  const generateKey = async () => {
    setGenerating(true)
    try {
      const res = await adminAPI.generateExternalAccessKey({ label: newKeyLabel.trim() })
      setNewKey(res.data.api_key || '')
      setNewKeyLabel('')
      toast.success('New API key generated')
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate API key')
    } finally {
      setGenerating(false)
    }
  }

  const toggleKey = async (key) => {
    setTogglingKeyId(key.id)
    try {
      await adminAPI.updateExternalAccessKey(key.id, { is_active: !key.is_active })
      await load()
      toast.success(key.is_active ? 'API key disabled' : 'API key enabled')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update API key')
    } finally {
      setTogglingKeyId(null)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-swiggy-gray-dark">Loading API access settings...</div>
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-swiggy-dark">Generate API Key</h1>
          <p className="text-sm text-swiggy-gray-dark mt-1">Create multiple keys for different partner apps and view them all here.</p>
        </div>
        <div className="text-xs bg-swiggy-orange/10 text-swiggy-orange px-3 py-1.5 rounded-full font-medium">
          {keyInfo.keys.length} key{keyInfo.keys.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-6 mb-6">
        <div className="bg-swiggy-dark text-white rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <FiKey className="text-swiggy-orange" />
            <p className="text-sm font-medium text-gray-300">Create a new access key</p>
          </div>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-400 outline-none mb-3"
            placeholder="Optional label, for example Partner App A"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
          />
          <button
            onClick={generateKey}
            disabled={generating}
            className="btn-orange px-5 disabled:opacity-60 flex items-center gap-2"
          >
            <FiRefreshCw className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating...' : 'Generate New Key'}
          </button>

          {newKey ? (
            <div className="mt-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3 break-all font-mono text-sm text-swiggy-orange">
                {newKey}
              </div>
              <button onClick={() => copy(newKey, 'API key')} className="text-sm font-medium text-white underline">
                Copy new key
              </button>
              <p className="text-xs text-gray-400 mt-3">This full key is shown only once after generation. Store it safely in the other app.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-4">Generated keys are only shown once in full. Saved entries below keep preview, label, and active state.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <FiShield className="text-swiggy-green" />
            <h2 className="font-bold text-swiggy-dark">How to use it</h2>
          </div>
          <p className="text-sm text-swiggy-gray-dark mb-3">Send the key in `x-api-key` or as a bearer token. External apps only get the four allowed datasets.</p>
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-swiggy-gray-dark mb-1">Header</p>
            <code className="text-xs break-all">x-api-key: {authExamples.header}</code>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-swiggy-gray-dark mb-1">Example request</p>
            <code className="text-xs break-all">{authExamples.curl}</code>
          </div>
          <button onClick={() => copy(authExamples.curl, 'cURL example')} className="mt-3 text-xs text-swiggy-orange font-medium underline">
            Copy example request
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-swiggy-dark">Existing API Keys</h2>
          <span className="text-xs text-swiggy-gray-dark">Create and manage multiple keys here.</span>
        </div>
        {keyInfo.keys.length === 0 ? (
          <p className="text-sm text-swiggy-gray-dark">No API keys created yet.</p>
        ) : (
          <div className="space-y-3">
            {keyInfo.keys.map((key) => (
              <div key={key.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-swiggy-dark">{key.label || 'Unlabeled key'}</p>
                  <p className="text-xs text-swiggy-gray-dark mt-1">{key.preview}</p>
                  <p className="text-xs text-swiggy-gray-dark mt-1">
                    Created {key.created_at ? new Date(key.created_at).toLocaleString() : 'recently'} - {key.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <button
                  onClick={() => toggleKey(key)}
                  disabled={togglingKeyId === key.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${key.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'} disabled:opacity-60`}
                >
                  {togglingKeyId === key.id ? 'Saving...' : key.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {ENDPOINTS.map((item) => (
          <div key={item.endpoint} className="bg-white rounded-2xl shadow-card p-5 border border-gray-100">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-swiggy-orange/10 text-swiggy-orange flex items-center justify-center flex-shrink-0">
                <FiDatabase />
              </div>
              <div>
                <h3 className="font-bold text-swiggy-dark">{item.title}</h3>
                <p className="text-sm text-swiggy-gray-dark mt-1">{item.desc}</p>
              </div>
            </div>
            <code className="block text-xs bg-gray-50 rounded-lg px-3 py-2 mb-3">{item.endpoint}</code>
            <div className="flex flex-wrap gap-2">
              {item.fields.map((field) => (
                <span key={field} className="text-xs bg-gray-100 text-swiggy-dark rounded-full px-2.5 py-1">
                  {field}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
