const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')
const { assignOrderToWorker } = require('../services/orderAssignment')

// POST /api/orders — customer places order
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const {
      restaurant_id, items, delivery_address, delivery_lat, delivery_lng,
      delivery_zone, subtotal, delivery_fee, total_amount
    } = req.body

    const resDoc = await db.collection('restaurants').doc(restaurant_id).get()
    if (!resDoc.exists) return res.status(404).json({ error: 'Restaurant not found' })
    const rest = resDoc.data()

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
    const workerEarning = Math.max(30, delivery_fee * 0.85)

    const orderId = db.collection('orders').doc().id
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      customer_id: req.user.id,
      restaurant_id,
      status: 'placed',
      pickup_address: rest.address,
      pickup_lat: rest.lat,
      pickup_lng: rest.lng,
      delivery_address,
      delivery_lat,
      delivery_lng,
      delivery_zone,
      subtotal,
      delivery_fee,
      total_amount,
      worker_earning: workerEarning,
      items: items.map(item => ({
        ...item,
        total_price: item.price * item.quantity
      })),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }

    await db.collection('orders').doc(orderId).set(orderData)

    // Auto-assign to nearest available worker (Needs to be adapted for Firestore)
    assignOrderToWorker(orderData).catch(console.error)

    res.status(201).json({ order: orderData, message: 'Order placed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/my — customer's order history
router.get('/my', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const snapshot = await db.collection('orders')
      .where('customer_id', '==', req.user.id)
      .orderBy('created_at', 'desc')
      .get()

    const orders = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data()
        // Join restaurant data
        const resDoc = await db.collection('restaurants').doc(data.restaurant_id).get()
        const rest = resDoc.data()
        
        let workerName = null
        if (data.worker_id) {
          const userQuery = await db.collection('users').where('id', '==', data.worker_id).limit(1).get()
          workerName = userQuery.empty ? null : userQuery.docs[0].data().name
        }

        return {
          ...data,
          id: doc.id,
          restaurant_name: rest?.name,
          restaurant_image: rest?.image_url,
          worker_name: workerName,
          created_at: data.created_at?.toDate()
        }
    }))

    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' })
    const order = doc.data()

    // Join data for detailed view
    const resDoc = await db.collection('restaurants').doc(order.restaurant_id).get()
    const rest = resDoc.data()
    
    let workerInfo = {}
    if (order.worker_id) {
      const userQuery = await db.collection('users').where('id', '==', order.worker_id).limit(1).get()
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data()
        workerInfo.worker_name = userData.name
        workerInfo.worker_phone = userData.phone
        
        const wpDoc = await db.collection('worker_profiles').doc(order.worker_id).get()
        if (wpDoc.exists) {
          const wp = wpDoc.data()
          workerInfo.vehicle_type = wp.vehicle_type
          workerInfo.worker_rating = wp.rating
        }
      }
    }

    res.json({ 
        ...order, 
        id: doc.id, 
        restaurant_name: rest?.name, 
        restaurant_address: rest?.address,
        ...workerInfo,
        created_at: order.created_at?.toDate()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id/tracking
router.get('/:id/tracking', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' })
    const order = doc.data()

    let workerTracking = {}
    if (order.worker_id) {
      const userQuery = await db.collection('users').where('id', '==', order.worker_id).limit(1).get()
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data()
        workerTracking.worker_name = userData.name
        workerTracking.worker_phone = userData.phone
        
        const wpDoc = await db.collection('worker_profiles').doc(order.worker_id).get()
        if (wpDoc.exists) {
          const wp = wpDoc.data()
          workerTracking.worker_lat = wp.current_lat
          workerTracking.worker_lng = wp.current_lng
          workerTracking.vehicle_type = wp.vehicle_type
        }
      }
    }

    const gpsSnapshot = await db.collection('orders').doc(req.params.id).collection('gps_logs')
      .orderBy('recorded_at', 'desc')
      .limit(50)
      .get()
    const gpsTrail = gpsSnapshot.docs.map(d => ({ ...d.data(), recorded_at: d.data().recorded_at?.toDate() }))

    res.json({ 
        ...order, 
        id: doc.id, 
        ...workerTracking,
        gps_trail: gpsTrail,
        created_at: order.created_at?.toDate()
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:id/cancel
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const orderRef = db.collection('orders').doc(req.params.id)
    const doc = await orderRef.get()
    
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' })
    const order = doc.data()

    if (order.customer_id !== req.user.id || !['placed','confirmed'].includes(order.status)) {
        return res.status(400).json({ error: 'Cannot cancel this order' })
    }

    await orderRef.update({ 
        status: 'cancelled', 
        updated_at: admin.firestore.FieldValue.serverTimestamp() 
    })
    
    res.json({ order: { ...order, status: 'cancelled' } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
