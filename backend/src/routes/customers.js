const express = require('express')
const router = express.Router()
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/addresses', authenticate, requireRole('customer'), async (req, res) => {
  res.json({ addresses: [] })
})

module.exports = router
