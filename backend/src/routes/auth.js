const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid')
const { db } = require('../utils/firebase')
const { authenticate } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')

const twilio = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()
const signToken = (user) => jwt.sign({
  id: user.id,
  role: user.role,
  name: user.name,
  email: user.email,
  restaurant_id: user.restaurant_id || null
}, process.env.JWT_SECRET, { expiresIn: '30d' })

const uploadWorkerProofToCloudinary = async (file, folder) => {
  if (!file) return null

  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim()
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim()
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim()

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
  }

  const extension = path.extname(file.originalname || '') || ''
  const publicId = `${uuidv4()}${extension}`
  const timestamp = Math.floor(Date.now() / 1000)
  const signaturePayload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex')

  const formData = new FormData()
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' })
  formData.append('file', blob, file.originalname || `${uuidv4()}${extension}`)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)
  formData.append('public_id', publicId)
  formData.append('resource_type', 'auto')

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${data?.error?.message || 'Unknown error'}`)
  }

  return data.secure_url || data.url || null
}

const getAvailableZones = async () => {
  const zoneSnapshot = await db.collection('delivery_zones').get().catch(() => ({ docs: [] }))
  const managedZones = zoneSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(zone => zone.is_active !== false && zone.zone_name)
    .sort((a, b) => (a.zone_name || '').localeCompare(b.zone_name || ''))

  if (managedZones.length) return managedZones

  const restaurantSnapshot = await db.collection('restaurants').get().catch(() => ({ docs: [] }))
  const fallbackZones = [...new Set(
    restaurantSnapshot.docs
      .map(doc => doc.data()?.zone)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b))

  return fallbackZones.map(zone => ({ id: zone, zone_name: zone, is_active: true, source: 'restaurants' }))
}

router.get('/worker-zones', async (req, res) => {
  try {
    const zones = await getAvailableZones()
    res.json({ zones })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register (customer)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body
    if (!name || !email || !phone || !password) return res.status(400).json({ error: 'All fields required' })

    const userEmailDoc = await db.collection('users').doc(email).get()
    const phoneQuery = await db.collection('users').where('phone', '==', phone).get()
    
    if (userEmailDoc.exists || !phoneQuery.empty) {
      return res.status(409).json({ error: 'Email or phone already registered' })
    }

    const userId = uuidv4()
    const hash = await bcrypt.hash(password, 10)
    
    const userData = {
      id: userId,
      name,
      email,
      phone,
      password_hash: hash,
      role: 'customer',
      is_verified: false,
      created_at: new Date()
    }

    await db.collection('users').doc(email).set(userData)
    const token = signToken(userData)

    // Send OTP
    const otp = generateOtp() 
    await db.collection('otp_codes').add({
      phone,
      code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
    
    console.log(`\n[DEV] OTP for ${phone}: ${otp}\n`)
    
    if (twilio && process.env.TWILIO_PHONE) {
      try {
        await twilio.messages.create({ body: `Your Swiggy OTP: ${otp}`, from: process.env.TWILIO_PHONE, to: phone })
      } catch (e) {
        console.error('Twilio Error:', e.message)
      }
    }

    res.status(201).json({ user: userData, token, otp, message: 'OTP sent to your phone' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const userDoc = await db.collection('users').doc(email).get()
    
    if (!userDoc.exists) return res.status(401).json({ error: 'Invalid credentials' })
    const user = userDoc.data()

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user)
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        role: user.role, 
        is_verified: user.is_verified,
        restaurant_id: user.restaurant_id || null
      }, 
      token 
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body
    const otp = generateOtp()
    
    await db.collection('otp_codes').add({
      phone,
      code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
    
    if (twilio && process.env.TWILIO_PHONE) {
      await twilio.messages.create({ 
        body: `Your Swiggy OTP: ${otp}`, 
        from: process.env.TWILIO_PHONE, 
        to: phone 
      })
    }
    res.json({ otp, message: 'OTP sent' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body

    // Single-field query only — no composite index needed
    const otpQuery = await db.collection('otp_codes')
      .where('phone', '==', phone)
      .get()

    // Client-side filter: matching code, not used, not expired
    const now = new Date()
    const validDoc = otpQuery.docs
      .filter(d => {
        const data = d.data()
        const expiresAt = data.expires_at?.toDate ? data.expires_at.toDate() : new Date(data.expires_at)
        return data.code === code && data.used === false && expiresAt > now
      })
      .sort((a, b) => {
        const tA = a.data().created_at?.toDate ? a.data().created_at.toDate() : new Date(a.data().created_at)
        const tB = b.data().created_at?.toDate ? b.data().created_at.toDate() : new Date(b.data().created_at)
        return tB - tA
      })[0]

    if (!validDoc) return res.status(400).json({ error: 'Invalid or expired OTP' })

    await validDoc.ref.update({ used: true })

    const userQuery = await db.collection('users').where('phone', '==', phone).get()
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.update({ is_verified: true })
    }

    res.json({ verified: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/worker-register
router.post('/worker-register', upload.fields([{ name: 'id_proof', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, email, phone, password, vehicle_type, zone, id_proof_type, platform_experience_years } = req.body

    if (!zone) {
      return res.status(400).json({ error: 'Worker zone is required' })
    }

    const userEmailDoc = await db.collection('users').doc(email).get()
    const phoneQuery = await db.collection('users').where('phone', '==', phone).get()
    
    if (userEmailDoc.exists || !phoneQuery.empty) {
      return res.status(409).json({ error: 'Email or phone already registered' })
    }

    const userId = uuidv4()
    const hash = await bcrypt.hash(password, 10)
    
    const userData = {
      id: userId,
      name,
      email,
      phone,
      password_hash: hash,
      role: 'worker',
      is_verified: false,
      created_at: new Date()
    }

    await db.collection('users').doc(email).set(userData)

    const id_proof_url = await uploadWorkerProofToCloudinary(req.files?.id_proof?.[0], `worker-proofs/${userId}/id-proof`)
    const selfie_url = await uploadWorkerProofToCloudinary(req.files?.selfie?.[0], `worker-proofs/${userId}/selfie`)
    
    await db.collection('worker_profiles').doc(userId).set({
      user_id: userId,
      vehicle_type,
      zone,
      id_proof_url,
      id_proof_type,
      selfie_url,
      platform_experience_years: platform_experience_years || 0,
      verification_status: 'pending',
      created_at: new Date()
    })

    const otp = generateOtp()
    await db.collection('otp_codes').add({
      phone,
      code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      created_at: new Date()
    })
    
    console.log(`Worker OTP for ${phone}: ${otp}`)

    const token = signToken(userData)
    res.status(201).json({ user: userData, token, otp, message: 'Registration submitted. Admin will verify your documents.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/restaurant-register', upload.fields([{ name: 'business_proof', maxCount: 1 }, { name: 'storefront_photo', maxCount: 1 }]), async (req, res) => {
  try {
    const { owner_name, restaurant_name, cuisine_type, address, zone, lat, lng, email, phone, password, business_proof_type } = req.body
    if (!owner_name || !restaurant_name || !cuisine_type || !address || !zone || !lat || !lng || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    const parsedLat = Number(lat)
    const parsedLng = Number(lng)
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({ error: 'Valid restaurant latitude and longitude are required' })
    }

    const userEmailDoc = await db.collection('users').doc(email).get()
    const phoneQuery = await db.collection('users').where('phone', '==', phone).get()
    if (userEmailDoc.exists || !phoneQuery.empty) {
      return res.status(409).json({ error: 'Email or phone already registered' })
    }

    const restaurantId = db.collection('restaurants').doc().id
    const hash = await bcrypt.hash(password, 10)

    const userData = {
      id: restaurantId,
      name: owner_name,
      email,
      phone,
      password_hash: hash,
      role: 'restaurant',
      restaurant_id: restaurantId,
      is_verified: false,
      created_at: new Date()
    }

    await db.collection('users').doc(email).set(userData)
    const business_proof_url = await uploadWorkerProofToCloudinary(req.files?.business_proof?.[0], `restaurant-proofs/${restaurantId}/business-proof`)
    const storefront_photo_url = await uploadWorkerProofToCloudinary(req.files?.storefront_photo?.[0], `restaurant-proofs/${restaurantId}/storefront`)
    await db.collection('restaurants').doc(restaurantId).set({
      name: restaurant_name,
      cuisine_type,
      address,
      zone,
      lat: parsedLat,
      lng: parsedLng,
      owner_name,
      contact_email: email,
      contact_phone: phone,
      business_proof_type: business_proof_type || '',
      business_proof_url,
      storefront_photo_url,
      verification_status: 'pending',
      is_active: false,
      created_at: new Date()
    })

    const otp = generateOtp()
    await db.collection('otp_codes').add({
      phone,
      code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
      created_at: new Date()
    })

    const token = signToken(userData)
    res.status(201).json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        restaurant_id: restaurantId,
        is_verified: false
      },
      token,
      otp,
      message: 'Restaurant registration submitted for admin approval.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    // Note: the authenticate middleware should now set req.user to what was stored in the token
    // If we want to refresh from DB, we do it here
    const userQuery = await db.collection('users').where('id', '==', req.user.id).limit(1).get()
    if (userQuery.empty) return res.status(404).json({ error: 'User not found' })
    
    const user = userQuery.docs[0].data()
    delete user.password_hash
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
