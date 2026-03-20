const express = require('express')
const router = express.Router()
const { db, admin } = require('../utils/firebase')
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/addresses', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const userQuery = await db.collection('users').where('id', '==', req.user.id).limit(1).get()
    if (userQuery.empty) return res.status(404).json({ error: 'Customer not found' })

    const user = userQuery.docs[0].data()
    res.json({
      addresses: user.delivery_address ? [{ label: 'Saved Address', address: user.delivery_address }] : [],
      delivery_address: user.delivery_address || ''
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/address', authenticate, requireRole('customer'), async (req, res) => {
  try {
    const deliveryAddress = String(req.body.delivery_address || '').trim()
    if (!deliveryAddress) return res.status(400).json({ error: 'Delivery address is required' })

    const userQuery = await db.collection('users').where('id', '==', req.user.id).limit(1).get()
    if (userQuery.empty) return res.status(404).json({ error: 'Customer not found' })

    await userQuery.docs[0].ref.update({
      delivery_address: deliveryAddress,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    })

    res.json({ delivery_address: deliveryAddress, message: 'Delivery address updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
