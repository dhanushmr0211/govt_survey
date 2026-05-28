const entityFileModel = require('../models/entityFileModel');
const { buildObjectName, uploadBuffer, getSignedReadUrl, deleteObject } = require('../config/gcs');
const { query } = require('../config/db');
const { env } = require('../config/env');

async function uploadFile(projectId, entityType, entityId, file, uploadedBy) {
  const objectName = buildObjectName(`${projectId}_${entityType}_${entityId}`, file.originalname);
  const uploaded = await uploadBuffer(file.buffer, objectName, file.mimetype);
  
  const entityFile = await entityFileModel.createEntityFile(
    projectId,
    entityType,
    entityId,
    uploaded.objectName, // Store object name in the URL column for now
    uploadedBy
  );
  
  const publicUrl = `https://storage.googleapis.com/${env.gcsBucketName}/${uploaded.objectName}`;
  
  // Sync to respective tables
  try {
    if (entityType === 'pole') {
      const poleRes = await query('SELECT image_url_1, image_url_2 FROM poles WHERE id = $1', [entityId]);
      if (poleRes.rows.length > 0) {
        const pole = poleRes.rows[0];
        let updateCol = null;
        if (!pole.image_url_1) updateCol = 'image_url_1';
        else if (!pole.image_url_2) updateCol = 'image_url_2';
        
        if (updateCol) {
          await query(`UPDATE poles SET ${updateCol} = $1 WHERE id = $2`, [publicUrl, entityId]);
        }
      }
    } else if (entityType === 'switch_point') {
      const spRes = await query('SELECT image_url_1, image_url_2 FROM switch_points WHERE id = $1', [entityId]);
      if (spRes.rows.length > 0) {
        const sp = spRes.rows[0];
        let updateCol = null;
        if (!sp.image_url_1) updateCol = 'image_url_1';
        else if (!sp.image_url_2) updateCol = 'image_url_2';
        
        if (updateCol) {
          await query(`UPDATE switch_points SET ${updateCol} = $1 WHERE id = $2`, [publicUrl, entityId]);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing image URL to entity tables on upload:', err);
  }
  
  return {
    ...entityFile,
    signed_url: publicUrl,
  };
}

async function getFilesForEntity(projectId, entityType, entityId) {
  const files = await entityFileModel.getFilesForEntity(projectId, entityType, entityId);
  const filesWithUrls = files.map((file) => ({
    ...file,
    signed_url: `https://storage.googleapis.com/${env.gcsBucketName}/${file.url}`,
  }));
  return filesWithUrls;
}

async function deleteFile(fileId) {
  const file = await entityFileModel.getFileById(fileId);
  if (!file) {
    throw new Error('File not found');
  }

  const publicUrl = `https://storage.googleapis.com/${env.gcsBucketName}/${file.url}`;

  // Delete from GCS
  try {
    await deleteObject(file.url);
  } catch (err) {
    console.error('Error deleting from GCS:', err);
    // Continue deleting from DB even if GCS fails
  }

  // Clear column from pole/switch_point
  try {
    if (file.entity_type === 'pole') {
      await query(`
        UPDATE poles 
        SET 
          image_url_1 = CASE WHEN image_url_1 = $1 THEN NULL ELSE image_url_1 END,
          image_url_2 = CASE WHEN image_url_2 = $1 THEN NULL ELSE image_url_2 END
        WHERE id = $2
      `, [publicUrl, file.entity_id]);
    } else if (file.entity_type === 'switch_point') {
      await query(`
        UPDATE switch_points 
        SET 
          image_url_1 = CASE WHEN image_url_1 = $1 THEN NULL ELSE image_url_1 END,
          image_url_2 = CASE WHEN image_url_2 = $1 THEN NULL ELSE image_url_2 END
        WHERE id = $2
      `, [publicUrl, file.entity_id]);
    }
  } catch (err) {
    console.error('Error clearing image URL from entity tables on delete:', err);
  }

  // Delete from DB
  await entityFileModel.deleteEntityFile(fileId);
  return true;
}

module.exports = { uploadFile, getFilesForEntity, deleteFile };
