const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole, encryptApiKey, decryptApiKey } = require('../middleware/auth')

router.use(authenticate, requireRole('admin'))

const normalizeZone = (value) => (value || '').trim().toLowerCase()
const buildKeyPreview = (key) => `${key.slice(0, 8)}...${key.slice(-4)}`

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0,0,0,0)

    const [profilesSnap, ordersTodaySnap, topWorkersEarningsSnap] = await Promise.all([
      db.collection('worker_profiles').get(),
      db.collection('orders').where('created_at', '>=', today).get(),
      db.collection('worker_earnings').where('earned_at', '>=', today).get()
    ])

    const total_workers = profilesSnap.size
    const active_workers = profilesSnap.docs.filter(d => d.data().current_status !== 'offline').length
    const pending_verification = profilesSnap.docs.filter(d => d.data().verification_status === 'pending').length

    const orders_today = ordersTodaySnap.size
    const delivered_today = ordersTodaySnap.docs.filter(d => d.data().status === 'delivered').length
    const failed_today = ordersTodaySnap.docs.filter(d => d.data().status === 'failed').length
    const success_rate = orders_today ? (delivered_today * 100 / orders_today).toFixed(1) : 0


    // Top Workers Aggregation
    const workerStats = topWorkersEarningsSnap.docs.reduce((acc, d) => {
        const data = d.data()
        if (!acc[data.worker_id]) acc[data.worker_id] = { id: data.worker_id, earnings: 0, distance: 0, orders: 0 }
        acc[data.worker_id].earnings += data.total_earning
        acc[data.worker_id].distance += data.distance_km
        acc[data.worker_id].orders++
        return acc
    }, {})

    const top_workers = await Promise.all(
        Object.values(workerStats)
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, 5)
            .map(async w => {
                const userQuery = await db.collection('users').where('id', '==', w.id).limit(1).get()
                return { ...w, name: userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name }
            })
    )

    const recentFailuresSnap = await db.collection('delivery_failures').orderBy('created_at', 'desc').limit(5).get().catch(() => ({ docs: [] }))
    const recent_failures = await Promise.all(recentFailuresSnap.docs.map(async d => {
        const data = d.data()
        const userQuery = await db.collection('users').where('id', '==', data.worker_id).limit(1).get()
        return {
          id: d.id,
          ...data,
          worker_name: userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name,
          time: data.created_at?.toDate ? new Date(data.created_at.toDate()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''
        }
    }))

    res.json({
      total_workers, active_workers, pending_verification,
      orders_today, delivered_today, failed_today, success_rate,
      top_workers,
      recent_failures
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/zones', async (req, res) => {
  try {
    const snapshot = await db.collection('delivery_zones').orderBy('zone_name', 'asc').get().catch(() => ({ docs: [] }))
    const zones = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate ? doc.data().created_at.toDate() : null
    }))
    res.json({ zones })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/external-access/key', async (req, res) => {
  try {
    const snapshot = await db.collection('external_api_keys').orderBy('created_at', 'desc').get().catch(() => ({ docs: [] }))
    const keys = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        preview: data.preview || null,
        label: data.label || '',
        is_active: data.is_active !== false,
        can_view: Boolean(data.encrypted_key && data.encryption_iv && data.encryption_tag),
        created_by: data.created_by || null,
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null,
        last_regenerated_at: data.last_regenerated_at?.toDate ? data.last_regenerated_at.toDate() : null
      }
    })

    res.json({
      keys,
      endpoints: [
        'GET /api/external/worker-profiles',
        'GET /api/external/worker-earnings',
        'GET /api/external/orders',
        'GET /api/external/workers'
      ]
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/external-access/key/generate', async (req, res) => {
  try {
    const rawKey = `swg_ext_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const now = admin.firestore.FieldValue.serverTimestamp()
    const keyRef = db.collection('external_api_keys').doc()
    const encryptedPayload = encryptApiKey(rawKey)

    await keyRef.set({
      key_hash: keyHash,
      preview: buildKeyPreview(rawKey),
      label: String(req.body?.label || '').trim(),
      is_active: true,
      ...encryptedPayload,
      created_by: req.user.id,
      created_at: now,
      last_regenerated_at: now
    })

    res.status(201).json({
      id: keyRef.id,
      api_key: rawKey,
      preview: buildKeyPreview(rawKey),
      message: 'New external API key generated. Copy it now because only the preview is stored.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/external-access/key/:id/reveal', async (req, res) => {
  try {
    const keyDoc = await db.collection('external_api_keys').doc(req.params.id).get()
    if (!keyDoc.exists) {
      return res.status(404).json({ error: 'API key not found' })
    }

    const data = keyDoc.data()
    if (!data?.encrypted_key || !data?.encryption_iv || !data?.encryption_tag) {
      return res.status(400).json({
        error: 'This key was created before key viewing was supported. Generate a new key to view it later.'
      })
    }

    const apiKey = decryptApiKey(data)
    res.json({ id: keyDoc.id, api_key: apiKey, preview: data.preview || buildKeyPreview(apiKey) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/external-access/key/:id', async (req, res) => {
  try {
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }

    if (req.body.label !== undefined) {
      updateData.label = String(req.body.label || '').trim()
    }

    if (req.body.is_active !== undefined) {
      updateData.is_active = Boolean(req.body.is_active)
    }

    await db.collection('external_api_keys').doc(req.params.id).update(updateData)
    res.json({ message: 'API key updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/restaurants', async (req, res) => {
  try {
    const snapshot = await db.collection('restaurants').get().catch(() => ({ docs: [] }))
    const restaurants = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data()
      const userQuery = await db.collection('users').where('restaurant_id', '==', doc.id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
      const owner = userQuery.empty ? {} : userQuery.docs[0].data()
      return {
        id: doc.id,
        ...data,
        owner_name: data.owner_name || owner.name || '',
        contact_email: data.contact_email || owner.email || '',
        contact_phone: data.contact_phone || owner.phone || '',
        created_at: data.created_at?.toDate ? data.created_at.toDate() : null
      }
    }))

    restaurants.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    res.json(restaurants)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/zones', async (req, res) => {
  try {
    const zoneName = (req.body.zone_name || '').trim()
    const dailyTargetOrders = Math.max(0, parseInt(req.body.daily_target_orders, 10) || 0)
    if (!zoneName) return res.status(400).json({ error: 'Zone name is required' })

    const existingSnapshot = await db.collection('delivery_zones').get().catch(() => ({ docs: [] }))
    const duplicate = existingSnapshot.docs.find(doc => normalizeZone(doc.data().zone_name) === normalizeZone(zoneName))
    if (duplicate) return res.status(409).json({ error: 'Zone already exists' })

    const zoneRef = db.collection('delivery_zones').doc()
    const zoneData = {
      zone_name: zoneName,
      daily_target_orders: dailyTargetOrders,
      is_active: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: req.user.id
    }

    await zoneRef.set(zoneData)
    res.status(201).json({ zone: { id: zoneRef.id, ...zoneData, created_at: new Date() } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/zones/:id', async (req, res) => {
  try {
    const updateData = {
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }

    if (req.body.zone_name !== undefined) {
      const zoneName = String(req.body.zone_name || '').trim()
      if (!zoneName) return res.status(400).json({ error: 'Zone name is required' })
      updateData.zone_name = zoneName
    }

    if (req.body.daily_target_orders !== undefined) {
      const dailyTargetOrders = Math.max(0, parseInt(req.body.daily_target_orders, 10) || 0)
      updateData.daily_target_orders = dailyTargetOrders
    }

    await db.collection('delivery_zones').doc(req.params.id).update(updateData)
    res.json({ message: 'Zone updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/zones/:id', async (req, res) => {
  try {
    await db.collection('delivery_zones').doc(req.params.id).delete()
    res.json({ message: 'Zone removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/restaurants/:id/verify', async (req, res) => {
  try {
    const { status } = req.body
    if (!['verified', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    await db.collection('restaurants').doc(req.params.id).update({
      verification_status: status,
      is_active: status === 'verified',
      verified_at: admin.firestore.FieldValue.serverTimestamp(),
      verified_by: req.user.id
    })

    const userQuery = await db.collection('users').where('restaurant_id', '==', req.params.id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.update({
        is_verified: status === 'verified'
      })
    }

    res.json({ message: `Restaurant ${status}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/restaurants/:id', async (req, res) => {
  try {
    const userQuery = await db.collection('users').where('restaurant_id', '==', req.params.id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.delete()
    }
    await db.collection('restaurants').doc(req.params.id).delete()
    res.json({ message: 'Restaurant removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/workers
router.get('/workers', async (req, res) => {
  try {
    const { status, verification } = req.query
    let query = db.collection('worker_profiles')
    if (verification) query = query.where('verification_status', '==', verification)
    if (status) query = query.where('current_status', '==', status)

    const snapshot = await query.get()
    const workers = await Promise.all(snapshot.docs.map(async doc => {
        const wp = doc.data()
        const [userQuery, earningsSnap] = await Promise.all([
          db.collection('users').where('id', '==', wp.user_id).limit(1).get(),
          db.collection('worker_earnings').where('worker_id', '==', wp.user_id).get().catch(() => ({ docs: [] }))
        ])
        const user = userQuery.empty ? {} : userQuery.docs[0].data()
        const lifetime_earnings = earningsSnap.docs.reduce((sum, d) => sum + (d.data().total_earning || 0), 0)
        
        return {
            id: wp.user_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            created_at: user.created_at?.toDate ? user.created_at.toDate() : null,
            is_verified: user.is_verified,
            ...wp,
            total_deliveries: wp.total_deliveries || 0,
            rating: wp.rating || 0,
            lifetime_earnings
        }
    }))

    res.json({ workers: workers.sort((a,b) => (b.created_at || 0) - (a.created_at || 0)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/workers/:id
router.get('/workers/:id', async (req, res) => {
  try {
    const userQuery = await db.collection('users').where('id', '==', req.params.id).limit(1).get()
    if (userQuery.empty) return res.status(404).json({ error: 'Worker not found' })
    const user = userQuery.docs[0].data()
    
    const wpDoc = await db.collection('worker_profiles').doc(req.params.id).get()
    const wp = wpDoc.exists ? wpDoc.data() : {}

    const [ordersSnap, earningsSnap, gpsLastSnap] = await Promise.all([
      db.collection('orders').where('worker_id', '==', req.params.id).get(),
      db.collection('worker_earnings').where('worker_id', '==', req.params.id).get(),
      db.collectionGroup('gps_logs').where('worker_id', '==', req.params.id).orderBy('recorded_at', 'desc').limit(1).get()
    ])

    const orderStats = {
        total: ordersSnap.size,
        delivered: ordersSnap.docs.filter(d => d.data().status === 'delivered').length,
        failed: ordersSnap.docs.filter(d => d.data().status === 'failed').length
    }
    
    const earnings = earningsSnap.docs.map(d => d.data())
    const earningStats = {
        total: earnings.reduce((sum, e) => sum + (e.total_earning || 0), 0),
        avg_per_order: earnings.length ? earnings.reduce((sum, e) => sum + (e.total_earning || 0), 0) / earnings.length : 0,
        total_distance: earnings.reduce((sum, e) => sum + (e.distance_km || 0), 0)
    }

    res.json({ 
        worker: { ...user, ...wp }, 
        orderStats, 
        earningStats, 
        lastLocation: gpsLastSnap.empty ? null : gpsLastSnap.docs[0].data() 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/workers/:id/verify
router.patch('/workers/:id/verify', async (req, res) => {
  try {
    const { status } = req.body
    await db.collection('worker_profiles').doc(req.params.id).update({
        verification_status: status,
        verified_at: admin.firestore.FieldValue.serverTimestamp(),
        verified_by: req.user.id
    })
    
    if (status === 'verified') {
        const userQuery = await db.collection('users').where('id', '==', req.params.id).limit(1).get()
        if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({ is_verified: true })
        }
    }
    res.json({ message: `Worker ${status}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/workers/:id', async (req, res) => {
  try {
    const userQuery = await db.collection('users').where('id', '==', req.params.id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.delete()
    }
    await db.collection('worker_profiles').doc(req.params.id).delete().catch(() => {})
    res.json({ message: 'Worker removed' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/fix-stuck-orders — patch all placed orders to ready
router.post('/fix-stuck-orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').where('status', '==', 'placed').get()
    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'ready', updated_at: admin.firestore.FieldValue.serverTimestamp() })
    })
    await batch.commit()
    res.json({ fixed: snapshot.size, message: `${snapshot.size} orders updated to ready` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/orders
router.get('/orders', async (req, res) => {
  try {
    const { status, date } = req.query
    let query = db.collection('orders')
    
    if (status) query = query.where('status', '==', status)
    
    const snapshot = await query.get().catch(() => ({ docs: [] }))
    const orders = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data()
        const [resDoc, customerQuery, workerQuery] = await Promise.all([
            db.collection('restaurants').doc(data.restaurant_id).get().catch(() => ({ data: () => ({}) })),
            db.collection('users').where('id', '==', data.customer_id).limit(1).get().catch(() => ({ empty: true, docs: [] })),
            data.worker_id ? db.collection('users').where('id', '==', data.worker_id).limit(1).get().catch(() => ({ empty: true, docs: [] })) : Promise.resolve(null)
        ])
        return {
            ...data,
            id: doc.id,
            restaurant_name: resDoc.data()?.name,
            customer_name: customerQuery.empty ? 'Unknown' : customerQuery.docs[0].data().name,
            worker_name: (workerQuery && !workerQuery.empty) ? workerQuery.docs[0].data().name : null,
            created_at: data.created_at?.toDate ? data.created_at.toDate() : null
        }
    }))
    orders.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))

    res.json({ orders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/live-workers
router.get('/live-workers', async (req, res) => {
  try {
    const snapshot = await db.collection('worker_profiles')
        .where('current_status', '!=', 'offline')
        .get()

    const workers = await Promise.all(snapshot.docs.map(async doc => {
        const wp = doc.data()
        const userQuery = await db.collection('users').where('id', '==', wp.user_id).limit(1).get()
        const user = userQuery.empty ? {} : userQuery.docs[0].data()
        
        const activeOrderSnap = await db.collection('orders')
            .where('worker_id', '==', wp.user_id)
            .where('status', 'in', ['assigned','picked_up','delivering'])
            .limit(1)
            .get()
        
        const activeOrder = activeOrderSnap.empty ? null : activeOrderSnap.docs[0].data()

        return {
            id: wp.user_id,
            name: user.name,
            phone: user.phone,
            ...wp,
            active_order_id: activeOrder?.id,
            order_number: activeOrder?.order_number,
            delivery_address: activeOrder?.delivery_address,
            last_location_update: wp.last_location_update?.toDate()
        }
    }))

    res.json({ workers: workers.sort((a,b) => b.last_location_update - a.last_location_update) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))

    const ordersSnap = await db.collection('orders').where('created_at', '>=', startDate).get().catch(() => ({ docs: [] }))
    const orders = ordersSnap.docs.map(d => ({ ...d.data(), created_at: d.data().created_at?.toDate() }))

    // Grouping by daily
    const dailyMap = orders.reduce((acc, o) => {
        const date = o.created_at.toISOString().split('T')[0]
        if (!acc[date]) acc[date] = { date, orders: 0, delivered: 0, failed: 0, revenue: 0 }
        acc[date].orders++
        if (o.status === 'delivered') acc[date].delivered++
        if (o.status === 'failed') acc[date].failed++
        acc[date].revenue += (o.total_amount || 0)
        return acc
    }, {})

    // Zones
    const zoneMap = orders.reduce((acc, o) => {
        const zone = o.delivery_zone || 'Unknown'
        if (!acc[zone]) acc[zone] = { delivery_zone: zone, orders: 0, total_duration: 0, count_duration: 0 }
        acc[zone].orders++
        if (o.actual_duration_min) {
            acc[zone].total_duration += o.actual_duration_min
            acc[zone].count_duration++
        }
        return acc
    }, {})
    const zones = Object.values(zoneMap).map(z => ({ 
        ...z, 
        avg_duration: z.count_duration ? z.total_duration / z.count_duration : 0 
    }))

    // Peak Hours
    const hourMap = orders.reduce((acc, o) => {
        const hour = o.created_at.getHours()
        acc[hour] = (acc[hour] || 0) + 1
        return acc
    }, {})
    const peakHours = Object.keys(hourMap).map(h => ({ hour: parseInt(h), orders: hourMap[h] }))


    res.json({ daily: Object.values(dailyMap), zones, peakHours })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// GET /api/admin/failures
router.get('/failures', async (req, res) => {
  try {
    const snapshot = await db.collection('delivery_failures').orderBy('created_at', 'desc').get()
    const failures = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data()
        const [orderDoc, userQuery] = await Promise.all([
            db.collection('orders').doc(data.order_id).get(),
            db.collection('users').where('id', '==', data.worker_id).limit(1).get()
        ])
        const o = orderDoc.exists ? orderDoc.data() : null
        return {
            ...data,
            id: doc.id,
            order_number: o?.order_number,
            delivery_zone: o?.delivery_zone,
            worker_name: userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name,
            reported_at: data.created_at?.toDate()
        }
    }))
    res.json({ failures })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/restaurants
router.post('/restaurants', async (req, res) => {
  try {
    const { name, cuisine_type, address, lat, lng, zone, manager_name, manager_email, manager_phone, manager_password } = req.body
    const parsedLat = Number(lat)
    const parsedLng = Number(lng)

    if (!name || !cuisine_type || !address || !zone || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({ error: 'Restaurant name, cuisine, address, zone, latitude, and longitude are required' })
    }

    if (manager_email && manager_password && manager_name) {
      const existingUser = await db.collection('users').doc(manager_email).get()
      if (existingUser.exists) {
        return res.status(409).json({ error: 'Manager email already exists' })
      }
    }

    const orderId = db.collection('restaurants').doc().id
    const data = {
        name, cuisine_type, address, lat: parsedLat, lng: parsedLng, zone,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    }
    await db.collection('restaurants').doc(orderId).set(data)

    if (manager_email && manager_password && manager_name) {
      const hash = await require('bcryptjs').hash(manager_password, 10)
      await db.collection('users').doc(manager_email).set({
        id: orderId,
        name: manager_name,
        email: manager_email,
        phone: manager_phone || '',
        password_hash: hash,
        role: 'restaurant',
        restaurant_id: orderId,
        is_verified: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    res.status(201).json({ id: orderId, ...data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
