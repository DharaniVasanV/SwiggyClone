const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../utils/firebase');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const hashApiKey = (key) => crypto.createHash('sha256').update(String(key || '')).digest('hex');

const requireExternalApiKey = async (req, res, next) => {
  try {
    const key =
      req.headers['x-external-api-key'] ||
      req.headers['x-api-key'] ||
      req.headers['x-insurance-api-key'] ||
      req.headers.authorization?.split(' ')[1];

    if (!key) {
      return res.status(401).json({ error: 'API key required' });
    }

    const hashedKey = hashApiKey(key);
    const snapshot = await db.collection('external_api_keys').get().catch(() => ({ docs: [] }));
    const matchingDoc = snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.key_hash === hashedKey && data.is_active !== false;
    });
    const envFallbackValid = process.env.INSURANCE_API_KEY && hashedKey === hashApiKey(process.env.INSURANCE_API_KEY);

    if (!matchingDoc && !envFallbackValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.externalApiAccess = matchingDoc ? { id: matchingDoc.id, ...matchingDoc.data() } : { source: 'env_fallback' };
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const requireInsuranceKey = requireExternalApiKey;

module.exports = { authenticate, requireRole, requireInsuranceKey, requireExternalApiKey, hashApiKey };
