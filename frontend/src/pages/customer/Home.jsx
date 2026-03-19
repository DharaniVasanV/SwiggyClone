import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiSearch, FiClock, FiStar, FiTrendingUp } from 'react-icons/fi'
import { restaurantAPI } from '../../services/api'
import RestaurantCard from '../../components/customer/RestaurantCard'
import CategoryCard from '../../components/customer/CategoryCard'
import ShimmerCard from '../../components/common/ShimmerCard'

const CATEGORIES = [
  { name: 'Pizza', emoji: '🍕', color: '#fef3e2' },
  { name: 'Burgers', emoji: '🍔', color: '#fce8e8' },
  { name: 'Biryani', emoji: '🍛', color: '#e8f4e8' },
  { name: 'Chinese', emoji: '🥢', color: '#e8eef4' },
  { name: 'South Indian', emoji: '🥘', color: '#f4e8f4' },
  { name: 'Desserts', emoji: '🍰', color: '#fff3e8' },
  { name: 'Rolls', emoji: '🌯', color: '#e8f8f4' },
  { name: 'Beverages', emoji: '🥤', color: '#fef0e8' },
]

const BANNERS = [
  { id: 1, bg: '#FC8019', text: 'Free delivery on your first order', sub: 'Use code: FIRST50', cta: 'Order Now' },
  { id: 2, bg: '#60b246', text: '50% off on selected restaurants', sub: 'Limited time offer', cta: 'Explore' },
  { id: 3, bg: '#3d4152', text: 'Order for office? Try Swiggy for Business', sub: 'GST invoices • Bulk orders', cta: 'Try Now' },
]

export default function Home() {
  const [restaurants, setRestaurants] = useState([])
  const [topRated, setTopRated] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeBanner, setActiveBanner] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await restaurantAPI.getAll()
        setRestaurants(res.data.restaurants || [])
        setTopRated((res.data.restaurants || []).filter((r) => r.rating >= 4.3))
      } catch {
        setRestaurants([])
        setTopRated([])
      }
      finally { setLoading(false) }
    }
    fetchData()
    const timer = setInterval(() => setActiveBanner((b) => (b + 1) % BANNERS.length), 4000)
    return () => clearInterval(timer)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/restaurants?q=${search}`)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-swiggy-orange-light py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-swiggy-dark mb-2">
            Order food & groceries. <span className="text-swiggy-orange">Delivered</span> to your door.
          </h1>
          <p className="text-swiggy-gray-dark mb-6">30 minutes delivery • 500+ restaurants</p>
          <form onSubmit={handleSearch} className="flex items-center bg-white rounded-lg shadow-card max-w-2xl px-4 h-14 gap-3">
            <FiSearch className="text-swiggy-orange w-5 h-5 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for restaurants, cuisines or dishes..."
              className="flex-1 outline-none text-sm text-swiggy-dark placeholder-swiggy-gray-dark"
            />
            <button type="submit" className="bg-swiggy-orange text-white px-5 py-2 rounded font-semibold text-sm hover:bg-swiggy-orange-dark transition-colors">
              Search
            </button>
          </form>

          {/* Trust Badges */}
          <div className="flex gap-6 mt-6 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-swiggy-dark">
              <FiClock className="text-swiggy-orange" /><span>30 min avg delivery</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-swiggy-dark">
              <FiStar className="text-swiggy-orange" /><span>500+ top restaurants</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-swiggy-dark">
              <FiTrendingUp className="text-swiggy-orange" /><span>Live order tracking</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Promotional Banner */}
        <div className="relative rounded-xl overflow-hidden mb-10 h-32 cursor-pointer"
          style={{ backgroundColor: BANNERS[activeBanner].bg }}
          onClick={() => navigate('/restaurants')}>
          <div className="absolute inset-0 flex items-center justify-between px-8">
            <div>
              <p className="text-white font-bold text-xl">{BANNERS[activeBanner].text}</p>
              <p className="text-white/80 text-sm mt-1">{BANNERS[activeBanner].sub}</p>
            </div>
            <button className="bg-white text-swiggy-dark font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity">
              {BANNERS[activeBanner].cta}
            </button>
          </div>
          {/* Banner dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {BANNERS.map((_, i) => (
              <div key={i} onClick={(e) => { e.stopPropagation(); setActiveBanner(i) }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeBanner ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </div>

        {/* Food Categories */}
        <section className="mb-10">
          <h2 className="section-title">What's on your mind?</h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.name} category={cat} onClick={() => navigate(`/restaurants?cuisine=${cat.name}`)} />
            ))}
          </div>
        </section>

        <div className="border-t-4 border-swiggy-gray my-8" />

        {/* Top Rated Restaurants */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Top rated near you</h2>
            <Link to="/restaurants?sort=rating" className="text-sm text-swiggy-orange font-medium">See all →</Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <ShimmerCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {topRated.slice(0, 8).map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          )}
        </section>

        <div className="border-t-4 border-swiggy-gray my-8" />

        {/* All Restaurants */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">All restaurants</h2>
            <span className="text-sm text-swiggy-gray-dark">{restaurants.length} places</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <ShimmerCard key={i} />)}
            </div>
          ) : (
            restaurants.length === 0 ? (
              <div className="bg-white rounded-xl shadow-card p-10 text-center text-swiggy-gray-dark">No restaurants available right now.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {restaurants.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
            )
          )}
        </section>
      </div>
    </div>
  )
}
