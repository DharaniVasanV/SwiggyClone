import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { restaurantAPI } from '../../services/api'
import RestaurantCard from '../../components/customer/RestaurantCard'
import ShimmerCard from '../../components/common/ShimmerCard'
import { FiSearch } from 'react-icons/fi'

const SORTS = ['rating','name','orders']
const CUISINES = ['All','Pizza','Biryani','Burgers','South Indian','Chinese','Desserts']

export default function RestaurantList() {
  const [params] = useSearchParams()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.get('q')||'')
  const [sort, setSort] = useState('rating')
  const [cuisine, setCuisine] = useState(params.get('cuisine')||'All')

  useEffect(() => {
    setLoading(true)
    restaurantAPI.getAll({ q: search||undefined, sort, cuisine: cuisine==='All'?undefined:cuisine })
      .then(r => setRestaurants(r.data.restaurants||[]))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false))
  }, [search, sort, cuisine])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 flex items-center bg-swiggy-gray rounded px-3 h-10 gap-2">
          <FiSearch className="text-swiggy-gray-dark w-4 h-4"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurants..." className="bg-transparent flex-1 text-sm outline-none"/>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="border border-gray-200 rounded px-3 h-10 text-sm text-swiggy-dark bg-white">
          {SORTS.map(s => <option key={s} value={s}>Sort: {s}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {CUISINES.map(c => (
          <button key={c} onClick={() => setCuisine(c)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${cuisine===c?'bg-swiggy-dark text-white':'bg-white border border-gray-200 text-swiggy-gray-dark'}`}>{c}</button>
        ))}
      </div>
      <p className="text-sm text-swiggy-gray-dark mb-4">{loading ? '...' : `${restaurants.length} restaurants`}</p>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i) => <ShimmerCard key={i}/>)}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-10 text-center text-swiggy-gray-dark">No restaurants found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r}/>)}
        </div>
      )}
    </div>
  )
}
