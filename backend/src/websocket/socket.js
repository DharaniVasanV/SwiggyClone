const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io = null

const initWebSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
    transports: ['websocket', 'polling']
  })

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { id, role, name } = socket.user
    console.log(`Socket connected: ${name} (${role})`)

    // Worker joins their personal room
    if (role === 'worker') {
      socket.join(`worker:${id}`)
    }

    // Admin watches all live workers
    if (role === 'admin') {
      socket.on('admin:watch-workers', () => {
        socket.join('admin:live')
        console.log(`Admin ${name} watching live workers`)
      })
    }

    // Customer tracks a specific order
    socket.on('track:order', ({ orderId }) => {
      socket.join(`order:${orderId}`)
      console.log(`Tracking order: ${orderId}`)
    })

    // Worker sends GPS location update
    socket.on('worker:location', ({ lat, lng, orderId, speed, timestamp }) => {
      // Broadcast to customer tracking this order
      if (orderId) {
        io.to(`order:${orderId}`).emit(`order:${orderId}:location`, { lat, lng, speed, timestamp })
      }
      // Broadcast to admin live map
      io.to('admin:live').emit('workers:live-update', {
        worker_id: id,
        worker_name: name,
        lat, lng, speed,
        status: orderId ? 'delivering' : 'available',
        timestamp
      })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${name}`)
      // Notify admin
      io.to('admin:live').emit('workers:live-update', { worker_id: id, status: 'offline' })
    })
  })

  return io
}

const getIO = () => io

module.exports = { initWebSocket, getIO }
