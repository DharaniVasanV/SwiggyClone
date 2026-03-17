import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const V_STYLES = { verified:'bg-green-50 text-green-700', pending:'bg-amber-50 text-amber-700', rejected:'bg-red-50 text-red-700', suspended:'bg-gray-100 text-gray-600' }
const S_STYLES = { available:'bg-green-50 text-green-700', delivering:'bg-blue-50 text-blue-700', offline:'bg-gray-100 text-gray-600' }

export default function AdminWorkers() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    adminAPI.getWorkers().then(r => setWorkers(r.data.workers || [])).catch(() => setWorkers(MOCK)).finally(() => setLoading(false))
  }, [])

  const verify = async (id, status) => {
    try {
      await adminAPI.verifyWorker(id, status)
      setWorkers(w => w.map(x => x.id === id ? { ...x, verification_status: status } : x))
      toast.success(`Worker ${status}`)
    } catch { toast.error('Failed') }
  }

  const filtered = filter === 'all' ? workers : workers.filter(w => w.verification_status === filter)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Delivery Workers ({workers.length})</h1>
        <div className="flex gap-2">
          {['all','pending','verified','rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter===f ? 'bg-swiggy-orange text-white' : 'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-xs text-swiggy-gray-dark border-b border-gray-200">
            <th className="text-left px-4 py-3">Worker</th>
            <th className="text-left px-4 py-3">Vehicle</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Verification</th>
            <th className="text-left px-4 py-3">Orders</th>
            <th className="text-left px-4 py-3">Earnings</th>
            <th className="text-left px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-swiggy-dark">{w.name}</div>
                  <div className="text-xs text-swiggy-gray-dark">{w.phone}</div>
                </td>
                <td className="px-4 py-3 capitalize text-swiggy-gray-dark">{w.vehicle_type}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${S_STYLES[w.current_status]||'bg-gray-100 text-gray-600'}`}>{w.current_status}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${V_STYLES[w.verification_status]||''}`}>{w.verification_status}</span></td>
                <td className="px-4 py-3 text-swiggy-dark">{w.total_deliveries || 0}</td>
                <td className="px-4 py-3 font-medium text-swiggy-green">₹{Number(w.lifetime_earnings||0).toFixed(0)}</td>
                <td className="px-4 py-3">
                  {w.verification_status === 'pending' && (
                    <div className="flex gap-1">
                      <button onClick={() => verify(w.id,'verified')} className="text-xs bg-swiggy-green text-white px-2 py-1 rounded hover:opacity-90">Approve</button>
                      <button onClick={() => verify(w.id,'rejected')} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:opacity-90">Reject</button>
                    </div>
                  )}
                  {w.verification_status === 'verified' && (
                    <button onClick={() => verify(w.id,'suspended')} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300">Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MOCK = [
  { id:'1', name:'Ravi Kumar', phone:'+91 98400 11234', vehicle_type:'motorcycle', current_status:'delivering', verification_status:'verified', total_deliveries:312, lifetime_earnings:42800 },
  { id:'2', name:'Meena Patel', phone:'+91 98400 55678', vehicle_type:'scooter', current_status:'available', verification_status:'verified', total_deliveries:287, lifetime_earnings:38400 },
  { id:'3', name:'New Worker', phone:'+91 98400 99000', vehicle_type:'bicycle', current_status:'offline', verification_status:'pending', total_deliveries:0, lifetime_earnings:0 },
]
