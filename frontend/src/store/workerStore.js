import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWorkerStore = create(
  persist(
    (set, get) => ({
      status: 'offline',      // 'offline' | 'available' | 'delivering'
      activeOrder: null,
      availableOrders: [],
      setStatus: (status) => set({ status }),
      setActiveOrder: (order) => set({ activeOrder: order }),
      setAvailableOrders: (orders) => set({ availableOrders: orders }),
      addAvailableOrder: (order) => set((s) => {
        if (s.availableOrders.find(x => x.id === order.id)) return s
        return { availableOrders: [order, ...s.availableOrders] }
      }),
      removeAvailableOrder: (orderId) => set((s) => ({
        availableOrders: s.availableOrders.filter(x => x.id !== orderId)
      })),
    }),
    { name: 'swiggy-worker', partialize: (s) => ({ status: s.status }) }
  )
)
