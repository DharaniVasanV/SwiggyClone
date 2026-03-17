const { db, admin } = require('../utils/firebase')
const { getIO } = require('../websocket/socket')

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const assignOrderToWorker = async (order) => {
  try {
    // Single-field query only — no composite index needed
    const profileSnapshot = await db.collection('worker_profiles')
      .where('current_status', '==', 'available')
      .get()
      .catch(() => ({ empty: true, docs: [] }))

    if (profileSnapshot.empty) {
      console.log(`No available workers for order ${order.id}`)
      // Still mark order as ready so workers can pick it up manually
      await db.collection('orders').doc(order.id).update({
        status: 'ready',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      })
      return null
    }

    // Filter verified workers client-side
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

      // Get active orders client-side — single field query
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

    // Score workers — zone match + proximity + workload
    const scored = workers
      .filter(w => w.current_lat && w.current_lng)
      .map(w => {
        const dist = haversine(
          order.pickup_lat || 11.0168, order.pickup_lng || 76.9558,
          parseFloat(w.current_lat), parseFloat(w.current_lng)
        )
        const zoneBonus = (w.zone && order.delivery_zone && w.zone.toLowerCase() === order.delivery_zone.toLowerCase()) ? -15 : 0
        return { ...w, dist, score: dist + (w.active_orders * 1.5) + zoneBonus }
      })
      .filter(w => w.dist <= 50)
      .sort((a, b) => a.score - b.score)

    // Always mark order as ready so workers can see it in dashboard
    await db.collection('orders').doc(order.id).update({
      status: 'ready',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })

    if (!scored.length) {
      console.log(`No workers within 50km for order ${order.id}, marked as ready for manual pickup`)
      return null
    }

    const best = scored[0]

    // Notify best worker via socket
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
    // Always try to mark order as ready even on error
    await db.collection('orders').doc(order.id).update({
      status: 'ready',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }).catch(() => {})
    return null
  }
}

module.exports = { assignOrderToWorker, haversine }
