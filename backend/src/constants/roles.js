const ROLES = {
  MASTER_ADMIN: 'MASTER_ADMIN',
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
  EMPLOYEE: 'EMPLOYEE',
  MOBILE_USER: 'MOBILE_USER',
};

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function isKnownRole(role) {
  const normalizedRole = normalizeRole(role);
  return Object.values(ROLES).includes(normalizedRole);
}

module.exports = { ROLES, normalizeRole, isKnownRole };
