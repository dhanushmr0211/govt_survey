const { ZodError } = require('zod');
const { MulterError } = require('multer');

function notFound(req, res) {
  res.status(404).json({ message: 'Route not found', requestId: req.id });
}

function errorHandler(err, req, res, next) {
  const reqId = req.id;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ message: 'Validation error', errors: fieldErrors, requestId: reqId });
  }

  // Handle Multer upload errors
  if (err instanceof MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File is too large (max 5 MB)',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
    };
    return res.status(400).json({ message: messages[err.code] || err.message, requestId: reqId });
  }

  // Handle multer file-filter rejections (thrown as plain Error)
  if (err.message && err.message.includes('uploads are allowed')) {
    return res.status(400).json({ message: err.message, requestId: reqId });
  }

  console.error(`[${req.id}] Error:`, err);
  const status = err.status || 500;
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    stack: err.stack,
    fullError: String(err)
  });
}

module.exports = { notFound, errorHandler };
