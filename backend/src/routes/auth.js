const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { db } = require('../utils/firebase')
const { authenticate } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')

const twilio = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

const storage = multer.diskStorage({
  destination: 'uploads/id-proofs/',
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()
const signToken = (user) => jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' })

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
        is_verified: user.is_verified 
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
    const { name, email, phone, password, vehicle_type, id_proof_type, platform_experience_years } = req.body
    const id_proof_url = req.files?.id_proof?.[0]?.path || null
    const selfie_url = req.files?.selfie?.[0]?.path || null

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
    
    await db.collection('worker_profiles').doc(userId).set({
      user_id: userId,
      vehicle_type,
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
