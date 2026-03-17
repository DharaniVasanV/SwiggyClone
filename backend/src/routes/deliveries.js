const express = require('express')
const router = express.Router()
const { db } = require('../utils/firebase')
const { authenticate } = require('../middleware/auth')

router.get('/:id/gps', authenticate, async (req, res) => {
  try {
    const snapshot = await db.collection('orders').doc(req.params.id)
        .collection('gps_logs')
        .orderBy('recorded_at', 'asc')
        .get()
    
    const gps_trail = snapshot.docs.map(doc => ({
        ...doc.data(),
        recorded_at: doc.data().recorded_at?.toDate()
    }))

    res.json({ gps_trail })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
