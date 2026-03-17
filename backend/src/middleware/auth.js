const jwt = require('jsonwebtoken');

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

const requireInsuranceKey = (req, res, next) => {
  const key =
    req.headers['x-insurance-api-key'] ||
    req.headers.authorization?.split(' ')[1];
  if (key !== process.env.INSURANCE_API_KEY) {
    return res.status(401).json({ error: 'Invalid insurance API key' });
  }
  next();
};

module.exports = { authenticate, requireRole, requireInsuranceKey };
