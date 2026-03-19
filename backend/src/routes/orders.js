const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')
const { assignOrderToWorker } = require('../services/orderAssignment')

const normalizeText = (value) => (value || '').trim().toLowerCase()
const toDisplayZone = (value) => {
  const text = (value || '').trim()
  return text ? text.replace(/\b\w/g, (char) => char.toUpperCase()) : null
}
const toDate = (value) => (value?.toDate ? value.toDate() : value || null)

const refreshRestaurantRating = async (restaurantId) => {
  const snapshot = await db.collection('reviews').where('restaurant_id', '==', restaurantId).get().catch(() => ({ docs: [] }))
  const reviews = snapshot.docs.map((doc) => doc.data())
  const totalReviews = reviews.length
  const avgRating = totalReviews
    ? Number((reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / totalReviews).toFixed(1))
    : 0

  await db.collection('restaurants').doc(restaurantId).update({
    rating: avgRating,
    total_reviews: totalReviews,
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }).catch(() => {})
}

const resolveDeliveryZone = async (rawZone, deliveryAddress) => {
  if (rawZone && normalizeText(rawZone) !== 'zone a') return rawZone

  const address = normalizeText(deliveryAddress)
  if (!address) return rawZone || null

  const [zoneSnapshot, restaurantSnapshot, workerSnapshot] = await Promise.all([
    db.collection('delivery_zones').get().catch(() => ({ docs: [] })),
    db.collection('restaurants').get().catch(() => ({ docs: [] })),
    db.collection('worker_profiles').get().catch(() => ({ docs: [] }))
  ])

  const candidateZones = [
    ...zoneSnapshot.docs.map(doc => doc.data()?.zone_name).filter(Boolean),
    ...restaurantSnapshot.docs.map(doc => doc.data()?.zone).filter(Boolean),
    ...workerSnapshot.docs.map(doc => doc.data()?.zone).filter(Boolean)
  ]

  const uniqueZones = [...new Set(candidateZones.map(zone => zone.trim()))]
  const matchedZone = uniqueZones.find(zoneName => address.includes(normalizeText(zoneName)))

  if (matchedZone) return matchedZone

  const addressParts = deliveryAddress
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  const inferredCity = addressParts[addressParts.length - 1]
  return inferredCity ? toDisplayZone(inferredCity) : rawZone || null
}

// POST /api/orders — customer places order
router.post('/', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const {
      restaurant_id, items, delivery_address,
      delivery_zone, subtotal, delivery_fee, total_amount
    } = req.body

    const resDoc = await db.collection('restaurants').doc(restaurant_id).get()
    if (!resDoc.exists) return res.status(404).json({ error: 'Restaurant not found' })
    const rest = resDoc.data()
    const pickupLat = Number(rest.lat)
    const pickupLng = Number(rest.lng)

    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
      return res.status(400).json({ error: 'This restaurant is missing pickup coordinates. Please update the restaurant location before placing orders.' })
    }
    const resolvedDeliveryZone = await resolveDeliveryZone(delivery_zone, delivery_address)

    const resolvedDeliveryFee = Number.isFinite(Number(delivery_fee))
      ? Number(delivery_fee)
      : (Number.isFinite(Number(rest.delivery_fee)) ? Number(rest.delivery_fee) : 29)

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`
    const workerEarning = Math.max(30, resolvedDeliveryFee * 0.85)

    const orderId = db.collection('orders').doc().id
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      customer_id: req.user.id,
      restaurant_id,
      status: 'placed',
      pickup_address: rest.address,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      restaurant_zone: rest.zone || null,
      delivery_address,
      delivery_zone: resolvedDeliveryZone,
      subtotal,
      delivery_fee: resolvedDeliveryFee,
      total_amount: Number.isFinite(Number(total_amount)) ? Number(total_amount) : Number(subtotal || 0) + resolvedDeliveryFee,
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
      .get()
      .catch(() => ({ docs: [] }))

    const orders = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data()
        const [resDoc, reviewDoc] = await Promise.all([
          db.collection('restaurants').doc(data.restaurant_id).get().catch(() => ({ data: () => ({}) })),
          db.collection('reviews').doc(doc.id).get().catch(() => ({ exists: false }))
        ])
        const rest = resDoc.data()
        return {
          ...data,
          id: doc.id,
          restaurant_name: rest?.name,
          restaurant_image: rest?.image_url,
          review_submitted: reviewDoc.exists,
          review: reviewDoc.exists ? reviewDoc.data() : null,
          created_at: toDate(data.created_at)
        }
    }))

    orders.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/:id/review', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const rating = Math.max(1, Math.min(5, Number(req.body.rating) || 0))
    const comment = String(req.body.comment || '').trim()

    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' })
    }

    const orderRef = db.collection('orders').doc(req.params.id)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' })

    const order = orderDoc.data()
    if (order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Only delivered orders can be reviewed' })
    }

    const customerQuery = await db.collection('users').where('id', '==', req.user.id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
    const customer = customerQuery.empty ? null : customerQuery.docs[0].data()
    const reviewRef = db.collection('reviews').doc(req.params.id)

    await reviewRef.set({
      order_id: req.params.id,
      restaurant_id: order.restaurant_id,
      customer_id: req.user.id,
      customer_name: customer?.name || 'Customer',
      rating,
      comment,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true })

    await refreshRestaurantRating(order.restaurant_id)

    res.status(201).json({ message: 'Review submitted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id/tracking  — must be before /:id
router.get('/:id/tracking', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Order not found' })
    const order = doc.data()

    let workerTracking = {}
    if (order.worker_id) {
      const userQuery = await db.collection('users').where('id', '==', order.worker_id).limit(1).get().catch(() => ({ empty: true }))
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data()
        workerTracking.worker_name = userData.name
        workerTracking.worker_phone = userData.phone
        const wpDoc = await db.collection('worker_profiles').doc(order.worker_id).get().catch(() => ({ exists: false }))
        if (wpDoc.exists) {
          const wp = wpDoc.data()
          workerTracking.worker_lat = wp.current_lat
          workerTracking.worker_lng = wp.current_lng
          workerTracking.vehicle_type = wp.vehicle_type
          workerTracking.worker_rating = wp.rating
        }
      }
    }

    const gpsSnapshot = await db.collection('orders').doc(req.params.id).collection('gps_logs')
      .limit(50).get().catch(() => ({ docs: [] }))
    const gpsTrail = gpsSnapshot.docs.map(d => ({ ...d.data(), recorded_at: d.data().recorded_at?.toDate ? d.data().recorded_at.toDate() : null }))

    res.json({ ...order, id: doc.id, ...workerTracking, gps_trail: gpsTrail, created_at: toDate(order.created_at) })
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

    const resDoc = await db.collection('restaurants').doc(order.restaurant_id).get().catch(() => ({ data: () => ({}) }))
    const rest = resDoc.data()

    let workerInfo = {}
    if (order.worker_id) {
      const userQuery = await db.collection('users').where('id', '==', order.worker_id).limit(1).get().catch(() => ({ empty: true }))
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data()
        workerInfo.worker_name = userData.name
        workerInfo.worker_phone = userData.phone
        const wpDoc = await db.collection('worker_profiles').doc(order.worker_id).get().catch(() => ({ exists: false }))
        if (wpDoc.exists) {
          const wp = wpDoc.data()
          workerInfo.vehicle_type = wp.vehicle_type
          workerInfo.worker_rating = wp.rating
        }
      }
    }

    res.json({ ...order, id: doc.id, restaurant_name: rest?.name, restaurant_address: rest?.address, ...workerInfo, created_at: toDate(order.created_at) })
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
