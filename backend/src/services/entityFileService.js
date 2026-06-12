const entityFileModel = require('../models/entityFileModel');
const { buildObjectName, uploadBuffer, deleteObject } = require('../config/gcs');
const { pool, tgplPool, dbStorage, query } = require('../config/db');
const { env } = require('../config/env');

async function uploadFile(projectId, entityType, entityId, file, uploadedBy) {
  const activePool = String(projectId) === '3' ? tgplPool : pool;
  return dbStorage.run(activePool, async () => {
    const objectName = await buildObjectName(`${projectId}_${entityType}_${entityId}`, file.originalname);
    const uploaded = await uploadBuffer(file.buffer, objectName, file.mimetype);

    const publicUrl = `https://storage.googleapis.com/${env.gcsBucketName}/${uploaded.objectName}`;

    // Try inserting into entity_files — if the table doesn't exist (e.g. tgpl_survey DB), gracefully skip
    let entityFile = null;
    try {
      entityFile = await entityFileModel.createEntityFile(
        projectId,
        entityType,
        entityId,
        uploaded.objectName, // Store object name in the URL column for now
        uploadedBy
      );
    } catch (efErr) {
      console.error('Error inserting into entity_files (table may not exist):', efErr.message);
    }

    // Sync to respective tables regardless of entity_files insert outcome
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
      ...(entityFile || {}),
      id: entityFile ? entityFile.id : `fallback-${projectId}-${entityType}-${entityId}-${Date.now()}`,
      project_id: Number(projectId),
      entity_type: entityType,
      entity_id: entityId,
      url: uploaded.objectName,
      signed_url: publicUrl,
    };
  });
}

async function getFilesForEntity(projectId, entityType, entityId) {
  const activePool = String(projectId) === '3' ? tgplPool : pool;
  return dbStorage.run(activePool, async () => {
    // Fetch from entity_files — wrap in try-catch in case the table doesn't exist (e.g. legacy TGPL DB)
    let filesWithUrls = [];
    try {
      const files = await entityFileModel.getFilesForEntity(projectId, entityType, entityId);
      filesWithUrls = files.map((file) => ({
        ...file,
        signed_url: `https://storage.googleapis.com/${env.gcsBucketName}/${file.url}`,
      }));
    } catch (dbErr) {
      console.error('Error querying entity_files (table may not exist):', dbErr.message);
    }

    // Fallback for TGPL poles where images are stored in poles table columns
    if (String(projectId) === '3' && entityType === 'pole') {
      try {
        const poleRes = await query('SELECT image_url_1, image_url_2, created_at FROM poles WHERE id = $1', [entityId]);
        if (poleRes.rows.length > 0) {
          const pole = poleRes.rows[0];
          const extraFiles = [];
          if (pole.image_url_1) {
            extraFiles.push({
              id: `fallback-tgpl-${entityId}-1`,
              project_id: Number(projectId),
              entity_type: 'pole',
              entity_id: entityId,
              url: pole.image_url_1,
              signed_url: pole.image_url_1,
              uploaded_at: pole.created_at || new Date()
            });
          }
          if (pole.image_url_2) {
            extraFiles.push({
              id: `fallback-tgpl-${entityId}-2`,
              project_id: Number(projectId),
              entity_type: 'pole',
              entity_id: entityId,
              url: pole.image_url_2,
              signed_url: pole.image_url_2,
              uploaded_at: pole.created_at || new Date()
            });
          }
          // Deduplicate if already present in entity_files (comparing compatible signed_url formats)
          const existingUrls = new Set(filesWithUrls.map(f => f.signed_url));
          extraFiles.forEach(f => {
            if (!existingUrls.has(f.signed_url)) {
              filesWithUrls.push(f);
            }
          });
        }
      } catch (fallbackErr) {
        console.error('Error querying poles for TGPL image fallback:', fallbackErr.message);
      }
    }

    return filesWithUrls;
  });
}

async function deleteFile(fileId, projectId) {
  let activePool = pool;
  if (String(projectId) === '3') {
    activePool = tgplPool;
  } else {
    const fileIdStr = String(fileId);
    if (fileIdStr.startsWith('fallback-tgpl-')) {
      activePool = tgplPool;
    } else {
      activePool = dbStorage.getStore() || pool;
    }
  }

  return dbStorage.run(activePool, async () => {
    const fileIdStr = String(fileId);
    if (fileIdStr.startsWith('fallback-tgpl-')) {
      const parts = fileIdStr.split('-');
      const entityId = Number(parts[2]);
      const index = Number(parts[3]);
      
      if (isNaN(index) || (index !== 1 && index !== 2)) {
        throw new Error('Invalid fallback image slot index');
      }
      
      const updateCol = `image_url_${index}`;
      const poleRes = await query(`SELECT ${updateCol} FROM poles WHERE id = $1`, [entityId]);
      if (poleRes.rows.length > 0 && poleRes.rows[0][updateCol]) {
        const url = poleRes.rows[0][updateCol];
        const prefix = `https://storage.googleapis.com/${env.gcsBucketName}/`;
        if (url.startsWith(prefix)) {
          const objectName = url.slice(prefix.length);
          try {
            await deleteObject(objectName);
          } catch (gcsErr) {
            console.error('Error deleting fallback object from GCS:', gcsErr);
          }
        }
      }
      await query(`UPDATE poles SET ${updateCol} = NULL WHERE id = $1`, [entityId]);
      return true;
    }

    const file = await entityFileModel.getFileById(Number(fileId));
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
  });
}

module.exports = { uploadFile, getFilesForEntity, deleteFile };
