import { Link } from 'react-router-dom'
import { FiStar, FiClock } from 'react-icons/fi'

const PLACEHOLDER_COLORS = ['#FC8019','#60b246','#3d4152','#e23744','#7e57c2']

export default function RestaurantCard({ restaurant: r }) {
  const color = PLACEHOLDER_COLORS[r.name?.charCodeAt(0) % PLACEHOLDER_COLORS.length]

  return (
    <Link to={`/restaurant/${r.id}`} className="card block overflow-hidden group">
      {/* Image / Placeholder */}
      <div className="relative h-44 overflow-hidden">
        {r.image_url ? (
          <img src={r.image_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: color + '22' }}>
            {r.cuisine_type?.includes('Pizza') ? '🍕' :
             r.cuisine_type?.includes('Biryani') ? '🍛' :
             r.cuisine_type?.includes('Burger') ? '🍔' :
             r.cuisine_type?.includes('South') ? '🥘' :
             r.cuisine_type?.includes('Chinese') ? '🥢' : '🍽️'}
          </div>
        )}
        {/* Offer Badge */}
        {r.has_offer && (
          <div className="absolute bottom-0 left-0 right-0 bg-swiggy-green text-white text-xs font-bold px-3 py-1.5">
            {r.has_offer}
          </div>
        )}
        {/* Delivery time overlay */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-semibold text-swiggy-dark flex items-center gap-1">
          <FiClock className="w-3 h-3" />
          {r.delivery_time || '30-40'} mins
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-bold text-swiggy-dark text-sm truncate">{r.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <div className="flex items-center gap-0.5 bg-swiggy-green text-white text-xs font-bold px-1.5 py-0.5 rounded">
            <FiStar className="w-2.5 h-2.5" />
            {Number(r.rating).toFixed(1)}
          </div>
          <span className="text-swiggy-gray-dark text-xs">• {r.cuisine_type}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5 pb-2">
          <span className="text-xs text-swiggy-gray-dark truncate">{r.zone || 'Near you'}</span>
          <span className="text-xs text-swiggy-gray-dark">
            {r.delivery_fee === 0 ? (
              <span className="text-swiggy-green font-medium">Free delivery</span>
            ) : `₹${r.delivery_fee} delivery`}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-center">
          <span className="text-swiggy-orange font-bold text-xs group-hover:underline">ORDER NOW →</span>
        </div>
      </div>
    </Link>
  )
}
