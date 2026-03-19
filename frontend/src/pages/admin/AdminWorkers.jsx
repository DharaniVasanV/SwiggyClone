import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { FiUser, FiTruck, FiFileText, FiCheck, FiX } from 'react-icons/fi'

const V_STYLES = { verified: 'bg-green-50 text-green-700', pending: 'bg-amber-50 text-amber-700', rejected: 'bg-red-50 text-red-700', suspended: 'bg-gray-100 text-gray-600' }
const S_STYLES = { available: 'bg-green-50 text-green-700', delivering: 'bg-blue-50 text-blue-700', offline: 'bg-gray-100 text-gray-600' }

export default function AdminWorkers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    adminAPI.getWorkers()
      .then(r => setWorkers(r.data.workers || []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false))
  }, [])

  const verify = async (id, status) => {
    try {
      await adminAPI.verifyWorker(id, status)
      setWorkers(w => w.map(x => x.id === id ? { ...x, verification_status: status } : x))
      toast.success(`Worker ${status}`)
    } catch { toast.error('Failed to update worker') }
  }

  const removeWorker = async (id) => {
    try {
      await adminAPI.deleteWorker(id)
      setWorkers(prev => prev.filter(worker => worker.id !== id))
      toast.success('Worker removed')
    } catch {
      toast.error('Failed to remove worker')
    }
  }

  const pendingCount = workers.filter(w => w.verification_status === 'pending').length

  const filtered = tab === 'applications'
    ? workers.filter(w => w.verification_status === 'pending')
    : tab === 'all'
    ? workers
    : workers.filter(w => w.verification_status === tab)

  if (loading) return <div className="p-6 text-center text-swiggy-gray-dark py-20">Loading workers...</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Delivery Workers ({workers.length})</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { key: 'applications', label: 'Applications', badge: pendingCount },
          { key: 'all', label: 'All Workers' },
          { key: 'verified', label: 'Verified' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'suspended', label: 'Suspended' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${tab === t.key ? 'bg-swiggy-orange text-white' : 'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>
            {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-white text-swiggy-orange' : 'bg-swiggy-orange text-white'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications view — card layout */}
      {tab === 'applications' && (
        <div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card p-12 text-center text-swiggy-gray-dark">
              <FiCheck className="w-10 h-10 mx-auto mb-3 text-swiggy-green" />
              <p className="font-medium">No pending applications</p>
              <p className="text-sm mt-1">All worker applications have been reviewed</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map(w => (
                <div key={w.id} className="bg-white rounded-xl shadow-card p-5 border-l-4 border-amber-400">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-swiggy-orange/10 rounded-full flex items-center justify-center">
                        <FiUser className="text-swiggy-orange" />
                      </div>
                      <div>
                        <p className="font-bold text-swiggy-dark">{w.name || 'Unknown'}</p>
                        <p className="text-xs text-swiggy-gray-dark">{w.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${V_STYLES.pending}`}>Pending</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-swiggy-gray-dark">Phone</p>
                      <p className="font-medium text-swiggy-dark">{w.phone || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-swiggy-gray-dark">Vehicle</p>
                      <p className="font-medium text-swiggy-dark capitalize">{w.vehicle_type || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-swiggy-gray-dark">ID Proof</p>
                      <p className="font-medium text-swiggy-dark capitalize">{w.id_proof_type || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-swiggy-gray-dark">Experience</p>
                      <p className="font-medium text-swiggy-dark">{w.platform_experience_years ?? 0} yrs</p>
                    </div>
                  </div>

                  {w.id_proof_url && (
                    <a href={w.id_proof_url}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-swiggy-orange mb-4 hover:underline">
                      <FiFileText /> View ID Document
                    </a>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => verify(w.id, 'verified')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-swiggy-green text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity">
                      <FiCheck /> Approve
                    </button>
                    <button onClick={() => verify(w.id, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity">
                      <FiX /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All / Verified / Rejected / Suspended — table layout */}
      {tab !== 'applications' && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-swiggy-gray-dark">
              <FiTruck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No workers found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-swiggy-gray-dark border-b border-gray-200">
                  <th className="text-left px-4 py-3">Worker</th>
                  <th className="text-left px-4 py-3">Vehicle</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Verification</th>
                  <th className="text-left px-4 py-3">Orders</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-swiggy-dark">{w.name}</div>
                      <div className="text-xs text-swiggy-gray-dark">{w.phone}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-swiggy-gray-dark">{w.vehicle_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${S_STYLES[w.current_status] || 'bg-gray-100 text-gray-600'}`}>
                        {w.current_status || 'offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${V_STYLES[w.verification_status] || ''}`}>
                        {w.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-swiggy-dark">{w.total_deliveries || 0}</td>
                    <td className="px-4 py-3">
                      {w.verification_status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => verify(w.id, 'verified')} className="text-xs bg-swiggy-green text-white px-2 py-1 rounded hover:opacity-90">Approve</button>
                          <button onClick={() => verify(w.id, 'rejected')} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:opacity-90">Reject</button>
                        </div>
                      )}
                      {w.verification_status === 'verified' && (
                        <div className="flex gap-1">
                          <button onClick={() => verify(w.id, 'suspended')} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">Suspend</button>
                          <button onClick={() => removeWorker(w.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:opacity-90">Remove</button>
                        </div>
                      )}
                      {w.verification_status === 'suspended' && (
                        <div className="flex gap-1">
                          <button onClick={() => verify(w.id, 'verified')} className="text-xs bg-swiggy-green text-white px-2 py-1 rounded hover:opacity-90">Reinstate</button>
                          <button onClick={() => removeWorker(w.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:opacity-90">Remove</button>
                        </div>
                      )}
                      {w.verification_status === 'rejected' && (
                        <button onClick={() => removeWorker(w.id)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:opacity-90">Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
