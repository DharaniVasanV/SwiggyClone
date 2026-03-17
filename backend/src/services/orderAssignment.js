const { db, admin } = require('../utils/firebase')
const { getIO } = require('../websocket/socket')

// Haversine formula — distance between two GPS points in km
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const assignOrderToWorker = async (order) => {
  try {
    // Find all available verified workers
    const profileSnapshot = await db.collection('worker_profiles')
      .where('current_status', '==', 'available')
      .where('verification_status', '==', 'verified')
      .get()

    if (profileSnapshot.empty) {
      console.log(`No available workers for order ${order.id}`)
      return null
    }

    const workers = await Promise.all(profileSnapshot.docs.map(async doc => {
        const wp = doc.data()
        // Get user name
        const userQuery = await db.collection('users').where('id', '==', wp.user_id).limit(1).get()
        const userName = userQuery.empty ? 'Unknown' : userQuery.docs[0].data().name
        
        // Count active orders
        const activeOrdersSnapshot = await db.collection('orders')
            .where('worker_id', '==', wp.user_id)
            .where('status', 'in', ['assigned', 'delivering', 'picked_up'])
            .get()
            
        return {
            id: wp.user_id,
            name: userName,
            current_lat: wp.current_lat,
            current_lng: wp.current_lng,
            active_orders: activeOrdersSnapshot.size,
            zone: wp.zone // Get worker zone
        }
    }))

    // Score each worker: distance + moderate workload penalty + zone bonus
    const scored = workers
      .filter(w => w.current_lat && w.current_lng)
      .map((w) => {
        const dist = haversine(order.pickup_lat, order.pickup_lng, parseFloat(w.current_lat), parseFloat(w.current_lng))
        const workloadPenalty = w.active_orders * 1.5 // Reduced penalty to favor proximity
        
        // Zone priority logic: workers in the same zone get picked first if within range
        const zoneBonus = (w.zone === order.delivery_zone) ? -15 : 0 // Significant bonus (lower is better)
        
        return { ...w, dist, score: dist + workloadPenalty + zoneBonus }
      })
      .filter((w) => w.dist <= 50) // Increased range to capture more workers
      .sort((a, b) => a.score - b.score)

    if (!scored.length) {
      console.log(`No workers within 50km for order ${order.id}`)
      return null
    }

    const best = scored[0]

    // Notify best worker via socket
    const io = getIO()
    
    // Ensure we have restaurant name for the notification
    let restaurantName = order.restaurant_name;
    if (!restaurantName) {
      const rDoc = await db.collection('restaurants').doc(order.restaurant_id).get();
      restaurantName = rDoc.data()?.name;
    }

    io?.to(`worker:${best.id}`).emit('order:new', {
      ...order,
      restaurant_name: restaurantName,
      worker_earning: order.worker_earning,
      estimated_distance_km: best.dist.toFixed(2)
    })

    // Also update order status to 'ready' so worker can see it
    await db.collection('orders').doc(order.id).update({ 
        status: 'ready', 
        updated_at: admin.firestore.FieldValue.serverTimestamp() 
    })

    console.log(`Order ${order.id} offered to worker ${best.name} (${best.dist.toFixed(1)}km away)`)
    return best
  } catch (err) {
    console.error('Order assignment error:', err.message)
    return null
  }
}

module.exports = { assignOrderToWorker, haversine }
