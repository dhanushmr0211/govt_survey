/**
 * Shared pagination helper.
 *
 * Usage (controller):
 *   const { page, limit, offset } = parsePagination(req.query);
 *
 * Usage (model):
 *   const sql = `SELECT … ${paginationClause(limit, offset)}`;
 *
 * Response shape:
 *   { data: [...], pagination: { page, limit, total, totalPages } }
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Parse `page` and `limit` from the query string, with sane defaults.
 */
function parsePagination(query = {}) {
  let limit = Math.min(
    Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  let page = Math.max(parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Returns a `LIMIT $x OFFSET $y` SQL clause.
 * @param {number} paramIndex – the next available `$n` index in the query
 */
function paginationClause(paramIndex) {
  return `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
}

/**
 * Build the standard pagination envelope.
 */
function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { parsePagination, paginationClause, paginationMeta, DEFAULT_LIMIT, MAX_LIMIT };
