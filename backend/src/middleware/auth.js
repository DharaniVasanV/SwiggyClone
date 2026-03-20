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

const getApiKeyEncryptionSecret = () => {
  const secret = process.env.EXTERNAL_API_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET || '';
  if (!secret) {
    throw new Error('API key encryption secret is not configured');
  }
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptApiKey = (rawKey) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getApiKeyEncryptionSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(String(rawKey), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_key: encrypted.toString('base64'),
    encryption_iv: iv.toString('base64'),
    encryption_tag: tag.toString('base64')
  };
};

const decryptApiKey = (payload) => {
  if (!payload?.encrypted_key || !payload?.encryption_iv || !payload?.encryption_tag) {
    throw new Error('Encrypted API key is not available');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getApiKeyEncryptionSecret(),
    Buffer.from(payload.encryption_iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.encryption_tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted_key, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
};

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

module.exports = {
  authenticate,
  requireRole,
  requireInsuranceKey,
  requireExternalApiKey,
  hashApiKey,
  encryptApiKey,
  decryptApiKey
};
