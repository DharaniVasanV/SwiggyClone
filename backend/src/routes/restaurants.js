const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')

const getRestaurantForUser = async (user) => {
  const restaurantId = user.restaurant_id || user.id
  const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get()
  if (!restaurantDoc.exists) return null
  return { id: restaurantDoc.id, ...restaurantDoc.data() }
}

const hasValidCoords = (restaurant) => Number.isFinite(Number(restaurant?.lat)) && Number.isFinite(Number(restaurant?.lng))
const normalizeRestaurantForCustomer = (restaurant) => ({
  ...restaurant,
  rating: Number(restaurant?.rating || 0),
  total_reviews: Number(restaurant?.total_reviews || 0),
  delivery_fee: Number.isFinite(Number(restaurant?.delivery_fee)) ? Number(restaurant.delivery_fee) : 29,
  delivery_time: Number.isFinite(Number(restaurant?.delivery_time)) ? Number(restaurant.delivery_time) : 30
})

router.get('/me/status', authenticate, requireRole('restaurant'), async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user)
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })
    res.json({
      verificationStatus: restaurant.verification_status || 'pending',
      restaurant
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me/dashboard', authenticate, requireRole('restaurant'), async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user)
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })
    if (restaurant.verification_status !== 'verified') {
      return res.status(403).json({ error: 'Restaurant not verified', verificationStatus: restaurant.verification_status || 'pending' })
    }

    const [menuSnap, orderSnap, reviewSnap] = await Promise.all([
      db.collection('restaurants').doc(restaurant.id).collection('menu_items').get().catch(() => ({ docs: [] })),
      db.collection('orders').where('restaurant_id', '==', restaurant.id).get().catch(() => ({ docs: [] })),
      db.collection('reviews').where('restaurant_id', '==', restaurant.id).get().catch(() => ({ docs: [] }))
    ])

    const menuItems = menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const orders = await Promise.all(orderSnap.docs.map(async doc => {
      const data = doc.data()
      const customerQuery = await db.collection('users').where('id', '==', data.customer_id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
      return {
        id: doc.id,
        ...data,
        customer_name: customerQuery.empty ? 'Unknown' : customerQuery.docs[0].data().name,
        customer_phone: customerQuery.empty ? '' : customerQuery.docs[0].data().phone,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null
      }
    }))
    orders.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))

    const reviews = reviewSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null
      }
    }).sort((a, b) => (b.created_at || 0) - (a.created_at || 0))

    const stats = {
      total_orders: orders.length,
      active_orders: orders.filter(order => !['delivered', 'failed', 'cancelled'].includes(order.status)).length,
      menu_items: menuItems.length,
      avg_rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)) : restaurant.rating || 0
    }

    res.json({ restaurant: normalizeRestaurantForCustomer(restaurant), stats, menuItems, orders, reviews })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/me/menu', authenticate, requireRole('restaurant'), async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user)
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    const { name, description = '', price, category = 'Other', is_available = true, image_url = '' } = req.body
    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Name and price are required' })
    }

    const itemRef = db.collection('restaurants').doc(restaurant.id).collection('menu_items').doc()
    const itemData = {
      name,
      description,
      price: Number(price),
      category,
      is_available,
      image_url,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    }

    await itemRef.set(itemData)
    res.status(201).json({ item: { id: itemRef.id, ...itemData } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/me/menu/:itemId', authenticate, requireRole('restaurant'), async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user)
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    const { name, description, price, category, is_available, image_url } = req.body
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = Number(price)
    if (category !== undefined) updateData.category = category
    if (is_available !== undefined) updateData.is_available = is_available
    if (image_url !== undefined) updateData.image_url = image_url

    await db.collection('restaurants').doc(restaurant.id).collection('menu_items').doc(req.params.itemId).update(updateData)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/me/orders/:orderId/pickup', authenticate, requireRole('restaurant'), async (req, res) => {
  try {
    const restaurant = await getRestaurantForUser(req.user)
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' })

    const orderRef = db.collection('orders').doc(req.params.orderId)
    const orderDoc = await orderRef.get()
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' })

    const order = orderDoc.data()
    if (order.restaurant_id !== restaurant.id) return res.status(403).json({ error: 'Access denied' })
    if (!order.worker_id) return res.status(400).json({ error: 'No delivery person assigned yet' })

    await orderRef.update({
      status: 'picked_up',
      picked_up_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Public routes
router.get('/', async (req, res) => {
  try {
    const { cuisine, zone, sort = 'rating', q } = req.query
    let query = db.collection('restaurants').where('is_active', '==', true)

    if (cuisine) {
      query = query.where('cuisine_type', '==', cuisine)
    }
    if (zone) {
      query = query.where('zone', '==', zone)
    }

    const snapshot = await query.get()
    let restaurants = snapshot.docs
      .map(doc => normalizeRestaurantForCustomer({ id: doc.id, ...doc.data() }))
      .filter(hasValidCoords)

    if (q) {
      const searchTerm = q.toLowerCase()
      restaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.cuisine_type.toLowerCase().includes(searchTerm)
      )
    }

    if (sort === 'rating') {
      restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    } else if (sort === 'orders') {
      restaurants.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))
    } else {
      restaurants.sort((a, b) => a.name.localeCompare(b.name))
    }

    res.json({ restaurants })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json({ restaurants: [] })

    const snapshot = await db.collection('restaurants').where('is_active', '==', true).get()
    const searchTerm = q.toLowerCase()

    const restaurants = snapshot.docs
      .map(doc => normalizeRestaurantForCustomer({ id: doc.id, ...doc.data() }))
      .filter(hasValidCoords)
      .filter(r =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.cuisine_type.toLowerCase().includes(searchTerm)
      )
      .slice(0, 20)

    res.json({ restaurants })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('restaurants').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Restaurant not found' })
    res.json(normalizeRestaurantForCustomer({ id: doc.id, ...doc.data() }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id/menu', async (req, res) => {
  try {
    const resDoc = await db.collection('restaurants').doc(req.params.id).get()
    if (!resDoc.exists) return res.status(404).json({ error: 'Not found' })

    const snapshot = await resDoc.ref.collection('menu_items').get()

    const items = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.is_available !== false)
    const categories = items.reduce((acc, item) => {
      const cat = item.category || 'Other'
      if (!acc[cat]) acc[cat] = { name: cat, items: [] }
      acc[cat].items.push(item)
      return acc
    }, {})

    res.json({
      restaurant: normalizeRestaurantForCustomer({ id: resDoc.id, ...resDoc.data() }),
      categories: Object.values(categories).sort((a, b) => a.name.localeCompare(b.name))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
