const crypto = require('crypto');

/**
 * Middleware that attaches a unique correlation ID to every request.
 * If the client sends an X-Request-Id header, it is reused; otherwise a
 * new UUID v4 is generated. The ID is also set on the response header so
 * the caller can correlate logs with their request.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  return next();
}

module.exports = { requestId };
