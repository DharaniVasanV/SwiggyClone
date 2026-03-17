import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { restaurantAPI } from '../../services/api'
import RestaurantCard from '../../components/customer/RestaurantCard'
import ShimmerCard from '../../components/common/ShimmerCard'
import { FiSearch, FiFilter } from 'react-icons/fi'

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
      .catch(() => setRestaurants(MOCK))
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r}/>)}
        </div>
      )}
    </div>
  )
}

const MOCK = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: "Domino's Pizza", cuisine_type: 'Pizza, Italian', rating: 4.5, delivery_time: '25-30', delivery_fee: 29, zone: 'Zone A', has_offer: '20% OFF' },
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Biryani Blues', cuisine_type: 'Biryani, North Indian', rating: 4.3, delivery_time: '30-40', delivery_fee: 0, zone: 'Zone B', has_offer: 'Free Delivery' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'McDonald\'s', cuisine_type: 'Burgers, Fast Food', rating: 4.1, delivery_time: '20-25', delivery_fee: 29, zone: 'Zone A' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Saravana Bhavan', cuisine_type: 'South Indian', rating: 4.6, delivery_time: '35-45', delivery_fee: 49, zone: 'Zone C', has_offer: '30% OFF' },
]
