const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')
const { getIO } = require('../websocket/socket')

// GET /api/workers/dashboard
router.get('/dashboard', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0,0,0,0)

    const [statsSnapshot, allWorkerOrders, availableSnapshot, profileDoc] = await Promise.all([
      db.collection('worker_earnings').where('worker_id', '==', req.user.id).get().catch(() => ({ docs: [], size: 0 })),
      db.collection('orders').where('worker_id', '==', req.user.id).get().catch(() => ({ docs: [] })),
      db.collection('orders').where('status', 'in', ['ready', 'placed']).limit(20).get().catch(() => ({ docs: [] })),
      db.collection('worker_profiles').doc(req.user.id).get()
    ])

    const profileData = profileDoc.exists ? profileDoc.data() : {}
    const activeMs = profileData.daily_active_ms || 0

    const todayEarnings = statsSnapshot.docs.filter(d => {
      const earned = d.data().earned_at?.toDate ? d.data().earned_at.toDate() : new Date(d.data().earned_at)
      return earned >= today
    })

    const stats = {
      today_orders: todayEarnings.length,
      today_earnings: todayEarnings.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      distance_km: parseFloat(todayEarnings.reduce((sum, d) => sum + (d.data().distance_km || 0), 0).toFixed(1)),
      active_hours: parseFloat((activeMs / (1000 * 60 * 60)).toFixed(1))
    }

    const activeStatuses = ['assigned', 'picked_up', 'delivering']
    const activeDoc = allWorkerOrders.docs.find(d => activeStatuses.includes(d.data().status))
    let activeOrder = null
    if (activeDoc) {
      const orderData = activeDoc.data()
      const resDoc = await db.collection('restaurants').doc(orderData.restaurant_id).get().catch(() => ({ data: () => ({}) }))
      activeOrder = { ...orderData, id: activeDoc.id, restaurant_name: resDoc.data()?.name }
    }

    const availableOrders = await Promise.all(availableSnapshot.docs.map(async d => {
      const orderData = d.data()
      const resDoc = await db.collection('restaurants').doc(orderData.restaurant_id).get().catch(() => ({ data: () => ({}) }))
      return { ...orderData, id: d.id, restaurant_name: resDoc.data()?.name }
    }))

    res.json({ stats, activeOrder, availableOrders, status: profileData.current_status || 'offline' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/my-stats
router.get('/my-stats', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0,0,0,0)

    const [allOrders, allEarnings] = await Promise.all([
      db.collection('orders').where('worker_id', '==', req.user.id).get().catch(() => ({ docs: [] })),
      db.collection('worker_earnings').where('worker_id', '==', req.user.id).get().catch(() => ({ docs: [] }))
    ])

    const todayEarningDocs = allEarnings.docs.filter(d => {
      const t = d.data().earned_at?.toDate ? d.data().earned_at.toDate() : new Date(d.data().earned_at)
      return t >= today
    })

    res.json({
      today_orders: todayEarningDocs.length,
      today_earnings: todayEarningDocs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      total_deliveries: allOrders.docs.filter(d => d.data().status === 'delivered').length,
      lifetime_earnings: allEarnings.docs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0),
      today_distance: todayEarningDocs.reduce((sum, d) => sum + (d.data().distance_km || 0), 0)
    })
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
      .get()
      .catch(() => ({ docs: [] }))

    const filtered = snapshot.docs.filter(d => {
      const t = d.data().earned_at?.toDate ? d.data().earned_at.toDate() : new Date(d.data().earned_at)
      return t >= startDate
    })

    const earnings = await Promise.all(filtered.map(async d => {
      const data = d.data()
      const orderDoc = await db.collection('orders').doc(data.order_id).get().catch(() => ({ data: () => ({}) }))
      const o = orderDoc.data()
      return {
        ...data,
        order_number: o?.order_number,
        delivery_address: o?.delivery_address,
        date: data.earned_at?.toDate ? data.earned_at.toDate() : null,
        earned_at: data.earned_at?.toDate ? data.earned_at.toDate() : null
      }
    }))

    earnings.sort((a, b) => (b.earned_at || 0) - (a.earned_at || 0))

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

// GET /api/workers/orders/available  — must be before /orders/:id routes
router.get('/orders/available', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const profileDoc = await db.collection('worker_profiles').doc(req.user.id).get()
    if (!profileDoc.exists || profileDoc.data().verification_status !== 'verified') {
      return res.status(403).json({ error: 'Worker not verified' })
    }

    const snapshot = await db.collection('orders')
      .where('status', 'in', ['ready', 'placed'])
      .limit(20)
      .get()
      .catch(() => ({ docs: [] }))

    const orders = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()
      const resDoc = await db.collection('restaurants').doc(data.restaurant_id).get().catch(() => ({ data: () => ({}) }))
      const rest = resDoc.data()
      return {
        id: doc.id,
        ...data,
        restaurant_name: rest?.name,
        restaurant_image: rest?.image_url,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null
      }
    }))

    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/orders — worker's order history (must be before /orders/:id)
router.get('/orders', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('worker_id', '==', req.user.id)
      .get()
      .catch(() => ({ docs: [] }))

    const orders = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()
      const resDoc = await db.collection('restaurants').doc(data.restaurant_id).get().catch(() => ({ data: () => ({}) }))
      return {
        ...data,
        id: doc.id,
        restaurant_name: resDoc.data()?.name,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null
      }
    }))

    orders.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/workers/orders/:id — get single order detail for active delivery
router.get('/orders/:id', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const orderDoc = await db.collection('orders').doc(req.params.id).get()
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' })
    const order = orderDoc.data()

    const [resDoc, customerQuery] = await Promise.all([
      db.collection('restaurants').doc(order.restaurant_id).get().catch(() => ({ data: () => ({}) })),
      db.collection('users').where('id', '==', order.customer_id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
    ])

    const customer = customerQuery.empty ? {} : customerQuery.docs[0].data()

    res.json({
      ...order,
      id: orderDoc.id,
      restaurant_name: resDoc.data()?.name,
      customer_name: customer.name,
      customer_phone: customer.phone,
      created_at: order.created_at?.toDate ? order.created_at.toDate() : null
    })
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
      if (!orderDoc.exists || !['ready','placed'].includes(orderDoc.data().status) || orderDoc.data().worker_id) {
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

    const io = getIO()
    io?.to(`order:${req.params.id}`).emit(`order:${req.params.id}:status`, {
      status: 'assigned', worker_id: req.user.id, worker_name: req.user.name
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

    const updateData = { status, updated_at: admin.firestore.FieldValue.serverTimestamp() }
    if (status === 'picked_up') updateData.picked_up_at = admin.firestore.FieldValue.serverTimestamp()
    if (status === 'delivered') updateData.delivered_at = admin.firestore.FieldValue.serverTimestamp()

    await orderRef.update(updateData)

    if (status === 'delivered') {
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

// POST /api/workers/orders/:id/failure
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
      reason, description,
      worker_lat_at_failure: lat,
      worker_lng_at_failure: lng,
      worker_lat_at_assignment: o.pickup_lat || null,
      worker_lng_at_assignment: o.pickup_lng || null,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('orders').doc(req.params.id).update({
      status: 'failed', failure_reason: reason,
      failure_location_lat: lat, failure_location_lng: lng,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })

    await db.collection('worker_profiles').doc(req.user.id).update({ current_status: 'available' })

    // Notify customer via socket
    const io = getIO()
    io?.to(`order:${req.params.id}`).emit(`order:${req.params.id}:status`, {
      status: 'failed',
      reason,
      message: `Delivery failed: ${reason.replace(/_/g, ' ')}`
    })

    res.json({ message: 'Failure reported' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/workers/location
router.post('/location', authenticate, requireRole('worker'), async (req, res) => {
  try {
    const { lat, lng, speed = 0, order_id } = req.body

    await db.collection('worker_profiles').doc(req.user.id).update({
      current_lat: lat, current_lng: lng,
      last_location_update: admin.firestore.FieldValue.serverTimestamp()
    })

    if (order_id) {
      await db.collection('orders').doc(order_id).collection('gps_logs').add({
        worker_id: req.user.id, lat, lng, speed_kmh: speed,
        recorded_at: admin.firestore.FieldValue.serverTimestamp()
      })
      const io = getIO()
      io?.to(`order:${order_id}`).emit(`order:${order_id}:location`, { lat, lng, speed, timestamp: new Date() })
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

    const updateData = { current_status: status, updated_at: admin.firestore.FieldValue.serverTimestamp() }

    if (status === 'available') {
      updateData.last_online_at = admin.firestore.FieldValue.serverTimestamp()
    } else if (status === 'offline' && currentData.last_online_at) {
      const lastOnline = currentData.last_online_at.toDate()
      updateData.daily_active_ms = admin.firestore.FieldValue.increment(Date.now() - lastOnline.getTime())
    }

    await profileRef.update(updateData)
    const io = getIO()
    io?.to('admin:live').emit('workers:live-update', { worker_id: req.user.id, status })
    res.json({ status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
