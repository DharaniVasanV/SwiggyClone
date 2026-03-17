const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')
const { getIO } = require('../websocket/socket')

// GET /api/workers/orders/available
router.get('/orders/available', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const profileDoc = await db.collection('worker_profiles').doc(req.user.id).get()
    if (!profileDoc.exists || profileDoc.data().verification_status !== 'verified') {
      return res.status(403).json({ error: 'Worker not verified' })
    }

    const snapshot = await db.collection('orders')
      .where('status', '==', 'ready')
      .orderBy('created_at', 'asc')
      .limit(20)
      .get()
      .catch(err => {
        if (err.message.includes('FAILED_PRECONDITION')) {
          console.error('Firestore Index Missing: Create it here ->', err.message.split('here: ')[1]);
        }
        throw err;
      });

    const orders = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data()
        const resDoc = await db.collection('restaurants').doc(data.restaurant_id).get()
        const rest = resDoc.data()
        return { 
            id: doc.id, 
            ...data, 
            restaurant_name: rest?.name, 
            restaurant_image: rest?.image_url,
            created_at: data.created_at?.toDate() 
        }
    }))

    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/workers/orders/:id/accept
router.post('/orders/:id/accept', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const profileRef = db.collection('worker_profiles').doc(req.user.id)
    const profileDoc = await profileRef.get()
    if (!profileDoc.exists || profileDoc.data().verification_status !== 'verified') {
      return res.status(403).json({ error: 'Worker not verified' })
    }

    const orderRef = db.collection('orders').doc(req.params.id)
    const result = await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef)
      if (!orderDoc.exists || orderDoc.data().status !== 'ready' || orderDoc.data().worker_id) {
        throw new Error('Order no longer available')
      }

      const updateData = {
        worker_id: req.user.id,
        status: 'assigned',
        assigned_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }
      
      transaction.update(orderRef, updateData)
      transaction.update(profileRef, { current_status: 'delivering' })
      
      return { ...orderDoc.data(), ...updateData }
    })

    // Notify customer via socket
    const io = getIO()
    io?.to(`order:${req.params.id}`).emit(`order:${req.params.id}:status`, { 
        status: 'assigned', 
        worker_id: req.user.id, 
        worker_name: req.user.name 
    })

    res.json({ order: result })
  } catch (err) {
    res.status(err.message === 'Order no longer available' ? 409 : 500).json({ error: err.message })
  }
})

// PATCH /api/workers/orders/:id/status
router.patch('/orders/:id/status', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['picked_up', 'delivering', 'delivered']
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' })

    const orderRef = db.collection('orders').doc(req.params.id)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists || orderDoc.data().worker_id !== req.user.id) {
        return res.status(404).json({ error: 'Order not found' })
    }
    const order = orderDoc.data()

    const updateData = {
        status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
    if (status === 'picked_up') updateData.picked_up_at = admin.firestore.FieldValue.serverTimestamp()
    if (status === 'delivered') updateData.delivered_at = admin.firestore.FieldValue.serverTimestamp()

    await orderRef.update(updateData)

    if (status === 'delivered') {
      // Record earning
      await db.collection('worker_earnings').add({
        worker_id: req.user.id,
        order_id: req.params.id,
        base_earning: order.worker_earning || 0,
        total_earning: order.worker_earning || 0,
        distance_km: order.actual_distance_km || 0,
        duration_min: order.actual_duration_min || 0,
        earned_at: admin.firestore.FieldValue.serverTimestamp()
      })
      
      await db.collection('worker_profiles').doc(req.user.id).update({
        current_status: 'available',
        total_deliveries: admin.firestore.FieldValue.increment(1)
      })
    }


    const io = getIO()
    io?.to(`order:${req.params.id}`).emit(`order:${req.params.id}:status`, { status })

    res.json({ order: { ...order, ...updateData } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/workers/location — GPS ping
router.post('/location', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { lat, lng, speed = 0, order_id } = req.body

    await db.collection('worker_profiles').doc(req.user.id).update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: admin.firestore.FieldValue.serverTimestamp()
    })

    if (order_id) {
      await db.collection('orders').doc(order_id).collection('gps_logs').add({
        worker_id: req.user.id,
        lat,
        lng,
        speed_kmh: speed,
        recorded_at: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Broadcast to customer tracking this order
      const io = getIO()
      io?.to(`order:${order_id}`).emit(`order:${order_id}:location`, { lat, lng, speed, timestamp: new Date() })
      // Broadcast to admin live map
      io?.to('admin:live').emit('workers:live-update', { worker_id: req.user.id, lat, lng, speed, status: 'delivering' })
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/workers/status
router.patch('/status', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { status } = req.body
    const profileRef = db.collection('worker_profiles').doc(req.user.id)
    const profileDoc = await profileRef.get()
    const currentData = profileDoc.data() || {}
    
    const updateData = { 
        current_status: status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
    
    if (status === 'available') {
        updateData.last_online_at = admin.firestore.FieldValue.serverTimestamp()
    } else if (status === 'offline' && currentData.last_online_at) {
        const lastOnline = currentData.last_online_at.toDate()
        const activeMs = Date.now() - lastOnline.getTime()
        updateData.daily_active_ms = admin.firestore.FieldValue.increment(activeMs)
    }

    await profileRef.update(updateData)
    
    const io = getIO()
    io?.to('admin:live').emit('workers:live-update', { worker_id: req.user.id, status })
    res.json({ status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/workers/orders/:id/failure — report delivery failure
router.post('/orders/:id/failure', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { reason, description, lat, lng } = req.body
    const orderDoc = await db.collection('orders').doc(req.params.id).get()
    
    if (!orderDoc.exists || orderDoc.data().worker_id !== req.user.id) {
        return res.status(404).json({ error: 'Order not found' })
    }
    const o = orderDoc.data()

    await db.collection('delivery_failures').add({
      order_id: req.params.id,
      worker_id: req.user.id,
      reason,
      description,
      worker_lat_at_failure: lat,
      worker_lng_at_failure: lng,
      worker_lat_at_assignment: o.pickup_lat || null,
      worker_lng_at_assignment: o.pickup_lng || null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('orders').doc(req.params.id).update({
      status: 'failed',
      failure_reason: reason,
      failure_location_lat: lat,
      failure_location_lng: lng,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })
    
    await db.collection('worker_profiles').doc(req.user.id).update({ current_status: 'available' })

    res.json({ message: 'Failure reported' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/earnings
router.get('/earnings', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { period = 'week' } = req.query
    const days = period === 'day' ? 1 : period === 'month' ? 30 : 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const snapshot = await db.collection('worker_earnings')
      .where('worker_id', '==', req.user.id)
      .where('earned_at', '>=', startDate)
      .orderBy('earned_at', 'desc')
      .get()

    const earnings = await Promise.all(snapshot.docs.map(async d => {
        const data = d.data()
        const orderDoc = await db.collection('orders').doc(data.order_id).get()
        const o = orderDoc.data()
        return {
            ...data,
            order_number: o?.order_number,
            delivery_address: o?.delivery_address,
            actual_distance_km: o?.actual_distance_km,
            date: data.earned_at?.toDate(),
            earned_at: data.earned_at?.toDate()
        }
    }))

    const summary = earnings.reduce((acc, curr) => {
        acc.total_orders++
        acc.total_earnings += (curr.total_earning || 0)
        acc.total_distance += (curr.distance_km || 0)
        return acc
    }, { total_orders: 0, total_earnings: 0, total_distance: 0 })
    summary.avg_per_order = summary.total_orders ? summary.total_earnings / summary.total_orders : 0

    res.json({ earnings, summary })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/my-stats
router.get('/my-stats', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0,0,0,0)
    
    const [todayOrders, todayEarnings, totalDeliveries, lifetimeEarnings] = await Promise.all([
      db.collection('orders').where('worker_id', '==', req.user.id).where('created_at', '>=', today).get(),
      db.collection('worker_earnings').where('worker_id', '==', req.user.id).where('earned_at', '>=', today).get(),
      db.collection('orders').where('worker_id', '==', req.user.id).where('status', '==', 'delivered').get(),
      db.collection('worker_earnings').where('worker_id', '==', req.user.id).get()
    ])

    const stats = {
      today_orders: todayOrders.size,
      today_earnings: todayEarnings.docs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      total_deliveries: totalDeliveries.size,
      lifetime_earnings: lifetimeEarnings.docs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      today_distance: todayEarnings.docs.reduce((sum, d) => sum + (d.data().distance_km || 0), 0)
    }
    
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/dashboard
router.get('/dashboard', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0,0,0,0)

    const [statsSnapshot, activeOrderSnapshot, availableSnapshot, profileDoc] = await Promise.all([
      db.collection('worker_earnings').where('worker_id', '==', req.user.id).where('earned_at', '>=', today).get(),
      db.collection('orders').where('worker_id', '==', req.user.id).where('status', 'in', ['assigned','picked_up','delivering']).limit(1).get(),
      db.collection('orders').where('status', '==', 'ready').orderBy('created_at', 'asc').limit(10).get().catch(err => {
        if (err.message.includes('FAILED_PRECONDITION')) console.error('Index needed:', err.message.split('here: ')[1])
        return { docs: [] }
      }),
      db.collection('worker_profiles').doc(req.user.id).get()
    ])

    const profileData = profileDoc.data() || {}
    const activeMs = profileData.daily_active_ms || 0
    const activeHours = (activeMs / (1000 * 60 * 60)).toFixed(1)

    const stats = {
      today_orders: statsSnapshot.size,
      today_earnings: statsSnapshot.docs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      distance_km: statsSnapshot.docs.reduce((sum, d) => sum + (d.data().distance_km || 0), 0).toFixed(1),
      active_hours: parseFloat(activeHours)
    }

    let activeOrder = null
    if (!activeOrderSnapshot.empty) {
        const d = activeOrderSnapshot.docs[0]
        const orderData = d.data()
        const resDoc = await db.collection('restaurants').doc(orderData.restaurant_id).get()
        activeOrder = { ...orderData, id: d.id, restaurant_name: resDoc.data()?.name }
    }

    const availableOrders = await Promise.all(availableSnapshot.docs.map(async d => {
        const orderData = d.data()
        const resDoc = await db.collection('restaurants').doc(orderData.restaurant_id).get()
        return { ...orderData, id: d.id, restaurant_name: resDoc.data()?.name }
    }))

    res.json({
      stats,
      activeOrder,
      availableOrders,
      status: profileDoc.exists ? profileDoc.data().current_status : 'offline'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/orders — worker's order history
router.get('/orders', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('worker_id', '==', req.user.id)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()
      .catch(err => {
        if (err.message.includes('FAILED_PRECONDITION')) console.error('Index needed:', err.message.split('here: ')[1])
        throw err
      })

    const orders = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()
      const resDoc = await db.collection('restaurants').doc(data.restaurant_id).get()
      return {
        ...data,
        id: doc.id,
        restaurant_name: resDoc.data()?.name,
        created_at: data.created_at?.toDate()
      }
    }))
    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
