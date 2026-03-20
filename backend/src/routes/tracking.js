const express = require('express')
const router = express.Router()
const { db } = require('../utils/firebase')
const { authenticate } = require('../middleware/auth')

const fallbackEta = (maxEtaMin) => ({
  eta_min: null,
  eta_text: `${maxEtaMin} min max`,
  source: 'max_estimate',
  max_eta_min: maxEtaMin
})

const geocodeAddress = async (address) => {
  if (!address) return null

  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1'
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      'User-Agent': 'swiggy-clone/1.0'
    }
  })
  const data = await response.json()

  if (!response.ok || !Array.isArray(data) || data.length === 0) return null

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon)
  }
}

router.get('/orders/:id/eta', authenticate, async (req, res) => {
  try {
    const orderDoc = await db.collection('orders').doc(req.params.id).get()
    if (!orderDoc.exists) return res.status(404).json({ error: 'Order not found' })

    const order = orderDoc.data()
    const restaurantDoc = await db.collection('restaurants').doc(order.restaurant_id).get().catch(() => ({ exists: false, data: () => ({}) }))
    const restaurant = restaurantDoc.exists ? restaurantDoc.data() : {}
    const maxEtaMin = Number.isFinite(Number(restaurant.delivery_time)) ? Number(restaurant.delivery_time) : 45

    if (!['picked_up', 'delivering'].includes(order.status)) {
      return res.json(fallbackEta(maxEtaMin))
    }

    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    const destination = String(order.delivery_address || '').trim()

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !destination) {
      return res.json(fallbackEta(maxEtaMin))
    }

    const destinationCoords = await geocodeAddress(destination)
    if (!destinationCoords || !Number.isFinite(destinationCoords.lat) || !Number.isFinite(destinationCoords.lng)) {
      return res.json(fallbackEta(maxEtaMin))
    }

    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lng},${lat};${destinationCoords.lng},${destinationCoords.lat}?overview=false`)
    const data = await response.json()
    const route = data?.routes?.[0]

    if (!response.ok || !route) {
      return res.json(fallbackEta(maxEtaMin))
    }

    const durationSeconds = Number(route.duration || 0)
    const etaMin = Math.max(1, Math.round(durationSeconds / 60))

    res.json({
      eta_min: etaMin,
      eta_text: `${etaMin} min`,
      source: 'osrm',
      max_eta_min: maxEtaMin
    })
  } catch (err) {
    res.json(fallbackEta(45))
  }
})

module.exports = router
