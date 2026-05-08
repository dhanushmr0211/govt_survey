const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { normalizeRole } = require('../constants/roles');

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      ...payload,
      role: normalizeRole(payload.role),
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
