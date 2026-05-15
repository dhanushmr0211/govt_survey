const crypto = require('crypto');

/**
 * Middleware that attaches a unique correlation ID to every request.
 * It always generates a new UUID v4 on the server side to prevent clients
 * from spoofing or injecting malicious/unformatted request IDs.
 * The ID is also set on the response header so the caller can correlate logs.
 */
function requestId(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  return next();
}

module.exports = { requestId };
