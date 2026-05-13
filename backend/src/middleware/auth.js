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
    
    // Check that the token still belongs to an active user and has not
    // outlived an access update.
    const userResult = await query(
      'SELECT id, EXTRACT(EPOCH FROM updated_at)::int as updated_at_seconds FROM users WHERE id = $1 AND is_deleted = FALSE',
      [payload.sub]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    if (user.updated_at_seconds) {
      if (payload.iat < user.updated_at_seconds) {
        return res.status(401).json({ message: 'Permissions updated. Please log in again.' });
      }
    }

    req.user = {
      ...payload,
      id: Number(user.id),
      role: normalizeRole(payload.role),
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
