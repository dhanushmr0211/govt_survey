const { query } = require('../config/db');

async function findById(id) {
  const result = await query('SELECT id, name, email, role, phone, created_at, is_deleted FROM users WHERE id = $1 AND is_deleted = FALSE', [id]);
  return result.rows[0] || null;
}

async function findByEmail(email) {
  const result = await query('SELECT id, name, email, password, role, phone FROM users WHERE email = $1 AND is_deleted = FALSE', [email]);
  return result.rows[0] || null;
}

async function create(name, email, passwordHash, role, createdBy = null, phone = null) {
  const result = await query(
    'INSERT INTO users (name, email, password, role, created_by, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone',
    [name, email, passwordHash, role, createdBy, phone]
  );
  return result.rows[0];
}

async function countAll() {
  const result = await query('SELECT COUNT(*)::int AS total FROM users WHERE is_deleted = FALSE');
  return result.rows[0].total;
}

async function findAll(limit, offset) {
  const result = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE is_deleted = FALSE ORDER BY id DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

async function softDelete(id) {
  const result = await query(
    'UPDATE users SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = { findById, findByEmail, create, findAll, countAll, softDelete };
