import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export const connectSocket = () => {
  const token = useAuthStore.getState().token
  socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  socket.on('connect', () => console.log('Socket connected:', socket.id))
  socket.on('disconnect', () => console.log('Socket disconnected'))
  socket.on('connect_error', (err) => console.error('Socket error:', err.message))

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}

// Worker sends GPS pings
export const emitWorkerLocation = (lat, lng, orderId, speed = 0) => {
  if (socket?.connected) {
    socket.emit('worker:location', { lat, lng, orderId, speed, timestamp: new Date().toISOString() })
  }
}

// Customer subscribes to order tracking
export const subscribeToOrder = (orderId, onLocation, onStatusChange) => {
  if (!socket) return
  socket.emit('track:order', { orderId })
  socket.on(`order:${orderId}:location`, onLocation)
  socket.on(`order:${orderId}:status`, onStatusChange)
  return () => {
    socket.off(`order:${orderId}:location`, onLocation)
    socket.off(`order:${orderId}:status`, onStatusChange)
  }
}

// Admin subscribes to all live workers
export const subscribeToLiveWorkers = (onUpdate) => {
  if (!socket) return
  socket.emit('admin:watch-workers')
  socket.on('workers:live-update', onUpdate)
  return () => socket.off('workers:live-update', onUpdate)
}

// Worker receives new order notification
export const subscribeToNewOrders = (onNewOrder) => {
  if (!socket) return
  socket.on('order:new', onNewOrder)
  return () => socket.off('order:new', onNewOrder)
}
