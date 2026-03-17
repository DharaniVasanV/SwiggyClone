export default function CategoryCard({ category, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group cursor-pointer">
      <div className="w-full aspect-square rounded-xl flex items-center justify-center text-3xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: category.color }}>
        {category.emoji}
      </div>
      <span className="text-xs font-medium text-swiggy-dark text-center">{category.name}</span>
    </button>
  )
}
