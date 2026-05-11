const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { normalizeRole } = require('../constants/roles');
const { query } = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    
    // Check if user has been updated since token was issued
    const userResult = await query('SELECT updated_at FROM users WHERE id = $1', [payload.sub]);
    const user = userResult.rows[0];
    
    if (user && user.updated_at) {
      const updatedAtSeconds = Math.floor(new Date(user.updated_at).getTime() / 1000);
      if (payload.iat < updatedAtSeconds) {
        return res.status(401).json({ message: 'Permissions updated. Please log in again.' });
      }
    }

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
