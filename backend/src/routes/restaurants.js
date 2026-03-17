const express = require('express')
const router = express.Router()
const { db } = require('../utils/firebase')

// GET /api/restaurants
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
    let restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    if (q) {
      const searchTerm = q.toLowerCase()
      restaurants = restaurants.filter(r => 
        r.name.toLowerCase().includes(searchTerm) || 
        r.cuisine_type.toLowerCase().includes(searchTerm)
      )
    }

    // Manual sorting in memory for simplicity with NoSQL
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

// GET /api/restaurants/search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json({ restaurants: [] })
    
    const snapshot = await db.collection('restaurants').where('is_active', '==', true).get()
    const searchTerm = q.toLowerCase()
    
    const restaurants = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
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

// GET /api/restaurants/:id
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('restaurants').doc(req.params.id).get()
    if (!doc.exists) return res.status(404).json({ error: 'Restaurant not found' })
    res.json({ id: doc.id, ...doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/restaurants/:id/menu
router.get('/:id/menu', async (req, res) => {
  try {
    const resDoc = await db.collection('restaurants').doc(req.params.id).get()
    if (!resDoc.exists) return res.status(404).json({ error: 'Not found' })

    const snapshot = await resDoc.ref.collection('menu_items')
      .where('is_available', '==', true)
      .get()

    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    // Group by category
    const categories = items.reduce((acc, item) => {
      const cat = item.category || 'Other'
      if (!acc[cat]) acc[cat] = { name: cat, items: [] }
      acc[cat].items.push(item)
      return acc
    }, {})

    res.json({ 
      restaurant: { id: resDoc.id, ...resDoc.data() }, 
      categories: Object.values(categories).sort((a, b) => a.name.localeCompare(b.name)) 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
