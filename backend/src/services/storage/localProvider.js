const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function upload(file) {
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `${Date.now()}-${sanitizedName}`;
  const filePath = path.join(UPLOAD_DIR, fileKey);
  
  if (file.buffer) {
    fs.writeFileSync(filePath, file.buffer);
  }
  
  return {
    fileKey,
    url: `/uploads/${fileKey}`,
  };
}

async function deleteFile(fileKey) {
  const filePath = path.join(UPLOAD_DIR, fileKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return true;
}

async function getPublicUrl(fileKey) {
  return `/uploads/${fileKey}`;
}

module.exports = { upload, delete: deleteFile, getPublicUrl };
