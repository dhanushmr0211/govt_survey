const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { normalizeRole } = require('../constants/roles');
const { pool } = require('../config/db');

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
    const userResult = await pool.query(
      `SELECT id, email, role, is_blocked, EXTRACT(EPOCH FROM updated_at)::int as updated_at_seconds
       FROM users 
       WHERE id = $1 AND is_deleted = FALSE`,
      [payload.sub]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    if (user.is_blocked) {
      return res.status(401).json({ message: 'Your account has been blocked. Please contact support.' });
    }
    
    if (user.updated_at_seconds) {
      if (payload.iat < user.updated_at_seconds) {
        return res.status(401).json({ message: 'Permissions updated. Please log in again.' });
      }
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      sub: payload.sub,
      role: normalizeRole(user.role)
    };
    return next();
  } catch (error) {
    console.error('JWT Error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
