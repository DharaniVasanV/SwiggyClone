import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name:'', cuisine_type:'', address:'', lat:'', lng:'', zone:'' })

  useEffect(() => {
    adminAPI.getRestaurants().then(r => setRestaurants(r.data||[])).catch(() => setRestaurants(MOCK))
  }, [])

  const handleAdd = async () => {
    try {
      const res = await adminAPI.addRestaurant(form)
      setRestaurants(r => [res.data, ...r])
      setAdding(false)
      setForm({ name:'', cuisine_type:'', address:'', lat:'', lng:'', zone:'' })
      toast.success('Restaurant added')
    } catch { toast.error('Failed to add') }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-swiggy-dark">Restaurants ({restaurants.length})</h1>
        <button onClick={() => setAdding(!adding)} className="bg-swiggy-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-swiggy-orange-dark">
          + Add Restaurant
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-xl shadow-card p-5 mb-5">
          <h2 className="font-bold text-swiggy-dark mb-4">New Restaurant</h2>
          <div className="grid grid-cols-2 gap-3">
            {[['name','Restaurant name'],['cuisine_type','Cuisine type'],['address','Full address'],['lat','Latitude'],['lng','Longitude'],['zone','Zone']].map(([k,p]) => (
              <input key={k} className="input-field" placeholder={p} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}/>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} className="btn-orange px-6 py-2 text-sm">Add</button>
            <button onClick={() => setAdding(false)} className="btn-outline-orange px-6 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(r => (
          <div key={r.id} className="bg-white rounded-xl shadow-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-swiggy-dark">{r.name}</h3>
                <p className="text-xs text-swiggy-gray-dark mt-0.5">{r.cuisine_type}</p>
              </div>
              <div className="flex items-center gap-0.5 bg-swiggy-green text-white text-xs font-bold px-1.5 py-0.5 rounded">
                ★ {Number(r.rating||4.0).toFixed(1)}
              </div>
            </div>
            <p className="text-xs text-swiggy-gray-dark">{r.address}</p>
            <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-swiggy-gray-dark">
              <span>Zone: {r.zone||'—'}</span>
              <span className={r.is_active ? 'text-swiggy-green' : 'text-red-500'}>{r.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCK = [
  { id:'1', name:"Domino's Pizza", cuisine_type:'Pizza, Italian', address:'123 MG Road, Chennai', rating:4.5, zone:'Zone A', is_active:true },
  { id:'2', name:'Biryani Blues', cuisine_type:'Biryani, North Indian', address:'45 Anna Nagar, Chennai', rating:4.3, zone:'Zone B', is_active:true },
  { id:'3', name:'KFC', cuisine_type:'Chicken, Fast Food', address:'90 OMR, Chennai', rating:4.3, zone:'Zone C', is_active:true },
]
