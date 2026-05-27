const { uploadBuffer, deleteObject, getSignedReadUrl } = require('../../config/gcs');
const { env } = require('../../config/env');

async function upload(file) {
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const objectName = `${Date.now()}-${sanitizedName}`;
  const uploaded = await uploadBuffer(file.buffer, objectName, file.mimetype);
  return {
    fileKey: uploaded.objectName,
    url: `https://storage.googleapis.com/${env.gcsBucketName}/${uploaded.objectName}`,
  };
}

async function deleteFile(fileKey) {
  await deleteObject(fileKey);
  return true;
}

async function getPublicUrl(fileKey) {
  return `https://storage.googleapis.com/${env.env?.gcsBucketName || env.gcsBucketName}/${fileKey}`;
}

module.exports = { upload, delete: deleteFile, getPublicUrl };
