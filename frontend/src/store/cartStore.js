import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantName: '',

      addItem: (item, restaurantId, restaurantName) => {
        const { items, restaurantId: currentRestId } = get()
        // Different restaurant — clear cart first
        if (currentRestId && currentRestId !== restaurantId) {
          set({ items: [{ ...item, quantity: 1 }], restaurantId, restaurantName })
          return 'switched'
        }
        const existing = items.find((i) => i.id === item.id)
        if (existing) {
          set({ items: items.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) })
        } else {
          set({ items: [...items, { ...item, quantity: 1 }], restaurantId, restaurantName })
        }
        return 'added'
      },

      removeItem: (itemId) => {
        const items = get().items
        const updated = items.reduce((acc, i) => {
          if (i.id === itemId) {
            if (i.quantity > 1) acc.push({ ...i, quantity: i.quantity - 1 })
          } else acc.push(i)
          return acc
        }, [])
        set({ items: updated, ...(updated.length === 0 ? { restaurantId: null, restaurantName: '' } : {}) })
      },

      deleteItem: (itemId) => {
        const items = get().items.filter((i) => i.id !== itemId)
        set({ items, ...(items.length === 0 ? { restaurantId: null, restaurantName: '' } : {}) })
      },

      clearCart: () => set({ items: [], restaurantId: null, restaurantName: '' }),

      getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getItemQuantity: (itemId) => get().items.find((i) => i.id === itemId)?.quantity || 0,
    }),
    { name: 'swiggy-cart' }
  )
)
