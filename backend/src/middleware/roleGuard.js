const { normalizeRole } = require('../constants/roles');

function requireRole(...roles) {
  const allowedRoles = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: `Forbidden: Requires one of [${allowedRoles.join(', ')}]` });
    }

    return next();
  };
}

module.exports = { requireRole };
