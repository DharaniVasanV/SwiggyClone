// ShimmerCard.jsx
export default function ShimmerCard() {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-100">
      <div className="shimmer h-44" />
      <div className="p-3 space-y-2">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
      </div>
    </div>
  )
}
