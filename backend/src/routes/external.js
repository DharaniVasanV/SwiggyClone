const express = require('express');
const router = express.Router();
const { db } = require('../utils/firebase');
const { requireExternalApiKey } = require('../middleware/auth');

router.use(requireExternalApiKey);

const toDate = (value) => (value?.toDate ? value.toDate() : value || null);

const withPagination = (query, limitValue) => {
  const limit = Math.max(1, Math.min(parseInt(limitValue, 10) || 100, 500));
  return query.limit(limit);
};

router.get('/worker-profiles', async (req, res) => {
  try {
    const snapshot = await withPagination(db.collection('worker_profiles').orderBy('created_at', 'desc'), req.query.limit).get();
    const workerProfiles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: toDate(doc.data().created_at),
      verified_at: toDate(doc.data().verified_at),
      last_location_update: toDate(doc.data().last_location_update),
      updated_at: toDate(doc.data().updated_at)
    }));

    res.json({ worker_profiles: workerProfiles, count: workerProfiles.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/worker-earnings', async (req, res) => {
  try {
    const snapshot = await withPagination(db.collection('worker_earnings').orderBy('earned_at', 'desc'), req.query.limit).get();
    const workerEarnings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      earned_at: toDate(doc.data().earned_at)
    }));

    res.json({ worker_earnings: workerEarnings, count: workerEarnings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const snapshot = await withPagination(db.collection('orders').orderBy('created_at', 'desc'), req.query.limit).get();
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      created_at: toDate(doc.data().created_at),
      assigned_at: toDate(doc.data().assigned_at),
      picked_up_at: toDate(doc.data().picked_up_at),
      delivered_at: toDate(doc.data().delivered_at),
      updated_at: toDate(doc.data().updated_at)
    }));

    res.json({ orders, count: orders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/workers', async (req, res) => {
  try {
    const snapshot = await withPagination(db.collection('users').where('role', '==', 'worker'), req.query.limit).get();
    const workers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        is_verified: data.is_verified,
        created_at: toDate(data.created_at)
      };
    });

    res.json({ workers, count: workers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
