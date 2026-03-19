const { db, admin } = require('../utils/firebase')
const { getIO } = require('../websocket/socket')

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const normalizeZone = (value) => (value || '').trim().toLowerCase()

const orderMatchesWorkerZone = (order, workerZone) => {
  const normalizedWorkerZone = normalizeZone(workerZone)
  if (!normalizedWorkerZone) return false

  return normalizeZone(order.restaurant_zone) === normalizedWorkerZone &&
    normalizeZone(order.delivery_zone) === normalizedWorkerZone
}

const assignOrderToWorker = async (order) => {
  try {
    const profileSnapshot = await db.collection('worker_profiles')
      .where('current_status', '==', 'available')
      .get()
      .catch(() => ({ empty: true, docs: [] }))

    if (profileSnapshot.empty) {
      console.log(`No available workers for order ${order.id}`)
      await db.collection('orders').doc(order.id).update({
        status: 'ready',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      })
      return null
    }

    const verifiedDocs = profileSnapshot.docs.filter(d => d.data().verification_status === 'verified')

    if (!verifiedDocs.length) {
      console.log(`No verified workers available for order ${order.id}`)
      await db.collection('orders').doc(order.id).update({
        status: 'ready',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      })
      return null
    }

    const workers = await Promise.all(verifiedDocs.map(async doc => {
      const wp = doc.data()
      const userQuery = await db.collection('users').where('id', '==', wp.user_id).limit(1).get().catch(() => ({ empty: true, docs: [] }))
      const userName = userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name

      const activeOrdersSnap = await db.collection('orders')
        .where('worker_id', '==', wp.user_id)
        .get()
        .catch(() => ({ docs: [] }))
      const activeOrders = activeOrdersSnap.docs.filter(d => ['assigned', 'delivering', 'picked_up'].includes(d.data().status)).length

      return {
        id: wp.user_id,
        name: userName,
        current_lat: wp.current_lat,
        current_lng: wp.current_lng,
        active_orders: activeOrders,
        zone: wp.zone
      }
    }))

    const scored = workers
      .filter(w => orderMatchesWorkerZone(order, w.zone))
      .filter(w => w.current_lat && w.current_lng)
      .map(w => {
        const dist = haversine(
          order.pickup_lat || 11.0168, order.pickup_lng || 76.9558,
          parseFloat(w.current_lat), parseFloat(w.current_lng)
        )
        return { ...w, dist, score: dist + (w.active_orders * 1.5) }
      })
      .filter(w => w.dist <= 50)
      .sort((a, b) => a.score - b.score)

    await db.collection('orders').doc(order.id).update({
      status: 'ready',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })

    if (!scored.length) {
      console.log(`No same-zone workers within 50km for order ${order.id}, marked as ready for manual pickup`)
      return null
    }

    const best = scored[0]

    const io = getIO()
    let restaurantName = order.restaurant_name
    if (!restaurantName) {
      const rDoc = await db.collection('restaurants').doc(order.restaurant_id).get().catch(() => ({ data: () => ({}) }))
      restaurantName = rDoc.data()?.name
    }

    io?.to(`worker:${best.id}`).emit('order:new', {
      ...order,
      restaurant_name: restaurantName,
      estimated_distance_km: best.dist.toFixed(2)
    })

    console.log(`Order ${order.id} offered to worker ${best.name} (${best.dist.toFixed(1)}km, zone: ${best.zone})`)
    return best
  } catch (err) {
    console.error('Order assignment error:', err.message)
    await db.collection('orders').doc(order.id).update({
      status: 'ready',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => {})
    return null
  }
}

module.exports = { assignOrderToWorker, haversine }
