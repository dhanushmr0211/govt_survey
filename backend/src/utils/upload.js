const multer = require('multer');

const storage = multer.memoryStorage();
const allowedMimeTypes = ['image/jpeg', 'image/png'];

function fileFilter(req, file, cb) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG and PNG uploads are allowed'));
  }

  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = { upload, allowedMimeTypes };