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

    const keyDoc = await db.collection('app_settings').doc('external_api_access').get().catch(() => null);
    const config = keyDoc?.exists ? keyDoc.data() : null;
    const expectedHash = config?.key_hash || (process.env.INSURANCE_API_KEY ? hashApiKey(process.env.INSURANCE_API_KEY) : null);

    if (!expectedHash || hashApiKey(key) !== expectedHash) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.externalApiAccess = config || null;
    next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const requireInsuranceKey = requireExternalApiKey;

module.exports = { authenticate, requireRole, requireInsuranceKey, requireExternalApiKey, hashApiKey };
