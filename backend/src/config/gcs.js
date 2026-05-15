const path = require('path');
const { Storage } = require('@google-cloud/storage');

const { env } = require('./env');

const storage = new Storage({
  projectId: env.gcpProjectId,
});

const bucket = storage.bucket(env.gcsBucketName);

function buildObjectName(recordId, originalName) {
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  return `survey-records/${recordId}/${timestamp}-${safeName}`;
}

async function uploadBuffer(buffer, objectName, contentType) {
  const file = bucket.file(objectName);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
    },
    validation: 'crc32c',
  });

  return {
    bucketName: bucket.name,
    objectName,
    contentType,
  };
}

async function getSignedReadUrl(objectName) {
  const file = bucket.file(objectName);
  try {
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + env.gcsSignedUrlExpirationSeconds * 1000,
    });
    return url;
  } catch (err) {
    // On Cloud Run with attached SA (no JSON key), getSignedUrl fails.
    // Fall back to a public URL.
    console.error('getSignedUrl failed, using public URL fallback:', err.message);
    return `https://storage.googleapis.com/${env.gcsBucketName}/${objectName}`;
  }
}

async function deleteObject(objectName) {
  const file = bucket.file(objectName);
  const [exists] = await file.exists();
  if (exists) {
    await file.delete();
  }
}

module.exports = { storage, bucket, buildObjectName, uploadBuffer, getSignedReadUrl, deleteObject };