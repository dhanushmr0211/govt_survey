const entityFileModel = require('../models/entityFileModel');
const { buildObjectName, uploadBuffer, getSignedReadUrl, deleteObject } = require('../config/gcs');

async function uploadFile(projectId, entityType, entityId, file, uploadedBy) {
  const objectName = buildObjectName(`${projectId}_${entityType}_${entityId}`, file.originalname);
  const uploaded = await uploadBuffer(file.buffer, objectName, file.mimetype);
  
  const entityFile = await entityFileModel.createEntityFile(
    projectId,
    entityType,
    entityId,
    uploaded.objectName, // Store object name in the URL column for now to generate signed URLs later
    uploadedBy
  );
  
  return {
    ...entityFile,
    signed_url: await getSignedReadUrl(entityFile.url),
  };
}

async function getFilesForEntity(projectId, entityType, entityId) {
  const files = await entityFileModel.getFilesForEntity(projectId, entityType, entityId);
  const filesWithUrls = await Promise.all(
    files.map(async (file) => ({
      ...file,
      signed_url: await getSignedReadUrl(file.url),
    }))
  );
  return filesWithUrls;
}

async function deleteFile(fileId) {
  const file = await entityFileModel.getFileById(fileId);
  if (!file) {
    throw new Error('File not found');
  }
  // Delete from GCS
  try {
    await deleteObject(file.url);
  } catch (err) {
    console.error('Error deleting from GCS:', err);
    // Continue deleting from DB even if GCS fails
  }
  // Delete from DB
  await entityFileModel.deleteEntityFile(fileId);
  return true;
}

module.exports = { uploadFile, getFilesForEntity, deleteFile };
