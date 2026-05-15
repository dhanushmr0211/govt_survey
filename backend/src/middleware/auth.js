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
      `SELECT u.id, u.role, EXTRACT(EPOCH FROM u.updated_at)::int as updated_at_seconds,
              COALESCE(asa.section_a, false) as section_a,
              COALESCE(asa.section_b, false) as section_b,
              COALESCE(asa.section_c, false) as section_c,
              COALESCE(asa.section_d, false) as section_d,
              COALESCE(asa.section_e, false) as section_e,
              COALESCE(asa.section_f, false) as section_f,
              COALESCE(asa.section_g, false) as section_g,
              COALESCE(asa.section_h, false) as section_h
       FROM users u
       LEFT JOIN admin_section_access asa ON u.id = asa.admin_id
       WHERE u.id = $1 AND u.is_deleted = FALSE`,
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
      id: Number(user.id),
      sub: payload.sub,
      role: normalizeRole(user.role),
      section_a: user.section_a,
      section_b: user.section_b,
      section_c: user.section_c,
      section_d: user.section_d,
      section_e: user.section_e,
      section_f: user.section_f,
      section_g: user.section_g,
      section_h: user.section_h,
    };
    return next();
  } catch (error) {
    console.error('JWT Error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
