const path = require('path');
const { Storage } = require('@google-cloud/storage');

const { env } = require('./env');

const storage = new Storage({
  projectId: env.gcpProjectId,
  ...(env.gcpKeyFile ? { keyFilename: env.gcpKeyFile } : {}),
});

const bucket = storage.bucket(env.gcsBucketName);

async function buildObjectName(recordId, originalName) {
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  
  // Dynamically require db config to avoid circular dependency
  const { dbStorage, tgplPool } = require('./db');
  const isTgpl = dbStorage.getStore() === tgplPool;
  let folder = isTgpl ? 'TGPL-IMAGES' : 'survey-records';
  
  if (recordId) {
    const parts = recordId.split('_');
    if (parts.length >= 3) {
      const projectId = parts[0];
      const entityType = parts[1];
      const entityId = parts[2];
      
      if (projectId === '4') {
        folder = 'TGPL2-IMAGES';
      }

      if (projectId === '3') {
        folder = 'TGPL-IMAGES';
        if (entityType === 'pole') {
          try {
            const poleRes = await tgplPool.query('SELECT survey_type FROM poles WHERE id = $1', [Number(entityId)]);
            if (poleRes.rows.length > 0 && poleRes.rows[0].survey_type === 'installation') {
              folder = 'tgpl_istallation';
            }
          } catch (err) {
            console.error('Error querying survey_type in buildObjectName:', err);
          }
        }
      }
    }
  }
  
  return `${folder}/${recordId}/${timestamp}-${safeName}`;
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
