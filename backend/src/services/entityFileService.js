const entityFileModel = require('../models/entityFileModel');
const { buildObjectName, uploadBuffer, deleteObject } = require('../config/gcs');
const { pool, tgplPool, dbStorage, query } = require('../config/db');
const { env } = require('../config/env');

async function uploadFile(projectId, entityType, entityId, file, uploadedBy) {
  const isTgplDatabase = ['3', '4'].includes(String(projectId));
  const activePool = isTgplDatabase ? tgplPool : pool;
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
        uploaded.objectName,
        uploadedBy
      );
    } catch (efErr) {
      console.error('Error inserting into entity_files (table may not exist):', efErr.message);
    }

    // Sync to respective tables regardless of entity_files insert outcome
    try {
      if (String(projectId) === '4' && entityType === 'pole') {
        const poleRes = await query(
          'SELECT image_url_1, image_url_2 FROM tgpl2_poles WHERE id = $1 AND project_id = $2',
          [entityId, Number(projectId)]
        );
        if (poleRes.rows.length > 0) {
          const updateCol = !poleRes.rows[0].image_url_1 ? 'image_url_1' : !poleRes.rows[0].image_url_2 ? 'image_url_2' : null;
          if (updateCol) await query(`UPDATE tgpl2_poles SET ${updateCol} = $1, updated_at = NOW() WHERE id = $2 AND project_id = $3`, [publicUrl, entityId, Number(projectId)]);
        }
      } else if (entityType === 'installation' || (String(projectId) === '3' && entityType === 'pole')) {
        let instRes = null;
        if (entityType === 'installation') {
          instRes = await query('SELECT image_url_1, image_url_2, image_url_3 FROM tgpl_installations WHERE id = $1', [entityId]);
        }
        if (instRes && instRes.rows.length > 0) {
          const inst = instRes.rows[0];
          let updateCol = null;
          if (!inst.image_url_1) updateCol = 'image_url_1';
          else if (!inst.image_url_2) updateCol = 'image_url_2';
          else if (!inst.image_url_3) updateCol = 'image_url_3';

          if (updateCol) {
            await query(`UPDATE tgpl_installations SET ${updateCol} = $1 WHERE id = $2`, [publicUrl, entityId]);
          }
        } else {
          const poleRes = await query('SELECT image_url_1, image_url_2, image_url_3 FROM poles WHERE id = $1', [entityId]);
          if (poleRes.rows.length > 0) {
            const pole = poleRes.rows[0];
            let updateCol = null;
            if (!pole.image_url_1) updateCol = 'image_url_1';
            else if (!pole.image_url_2) updateCol = 'image_url_2';
            else if (!pole.image_url_3) updateCol = 'image_url_3';

            if (updateCol) {
              await query(`UPDATE poles SET ${updateCol} = $1 WHERE id = $2`, [publicUrl, entityId]);
            }
          }
        }
      } else if (entityType === 'pole') {
        const poleRes = await query('SELECT image_url_1, image_url_2, image_url_3 FROM poles WHERE id = $1', [entityId]);
        if (poleRes.rows.length > 0) {
          const pole = poleRes.rows[0];
          let updateCol = null;
          if (!pole.image_url_1) updateCol = 'image_url_1';
          else if (!pole.image_url_2) updateCol = 'image_url_2';
          else if (!pole.image_url_3) updateCol = 'image_url_3';

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
  const activePool = ['3', '4'].includes(String(projectId)) ? tgplPool : pool;
  return dbStorage.run(activePool, async () => {
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

    // Fallback for TGPL-family poles & installations where images are stored directly on the record
    if (['3', '4'].includes(String(projectId))) {
      try {
        const isTgpl2 = String(projectId) === '4';
        let table = isTgpl2 ? 'tgpl2_poles' : 'poles';
        if (String(projectId) === '3' && entityType === 'installation') {
          table = 'tgpl_installations';
        }
        const rowRes = await query(`SELECT image_url_1, image_url_2, image_url_3, created_at FROM ${table} WHERE id = $1`, [entityId]);
        if (rowRes.rows.length > 0) {
          const row = rowRes.rows[0];
          const extraFiles = [];
          if (row.image_url_1) {
            extraFiles.push({
              id: `fallback-tgpl${isTgpl2 ? '2' : ''}-${entityType}-${entityId}-1`,
              project_id: Number(projectId),
              entity_type: entityType,
              entity_id: entityId,
              url: row.image_url_1,
              signed_url: row.image_url_1,
              uploaded_at: row.created_at || new Date()
            });
          }
          if (row.image_url_2) {
            extraFiles.push({
              id: `fallback-tgpl${isTgpl2 ? '2' : ''}-${entityType}-${entityId}-2`,
              project_id: Number(projectId),
              entity_type: entityType,
              entity_id: entityId,
              url: row.image_url_2,
              signed_url: row.image_url_2,
              uploaded_at: row.created_at || new Date()
            });
          }
          if (row.image_url_3) {
            extraFiles.push({
              id: `fallback-tgpl${isTgpl2 ? '2' : ''}-${entityType}-${entityId}-3`,
              project_id: Number(projectId),
              entity_type: entityType,
              entity_id: entityId,
              url: row.image_url_3,
              signed_url: row.image_url_3,
              uploaded_at: row.created_at || new Date()
            });
          }
          const existingUrls = new Set(filesWithUrls.map(f => f.signed_url));
          extraFiles.forEach(f => {
            if (!existingUrls.has(f.signed_url)) {
              filesWithUrls.push(f);
            }
          });
        }
      } catch (fallbackErr) {
        console.error('Error querying record for TGPL image fallback:', fallbackErr.message);
      }
    }

    return filesWithUrls;
  });
}

async function deleteFile(fileId, projectId) {
  let activePool = pool;
  if (['3', '4'].includes(String(projectId))) {
    activePool = tgplPool;
  } else {
    const fileIdStr = String(fileId);
    if (fileIdStr.startsWith('fallback-tgpl-') || fileIdStr.startsWith('fallback-tgpl2-')) {
      activePool = tgplPool;
    } else {
      activePool = dbStorage.getStore() || pool;
    }
  }

  return dbStorage.run(activePool, async () => {
    const fileIdStr = String(fileId);
    if (fileIdStr.startsWith('fallback-tgpl-') || fileIdStr.startsWith('fallback-tgpl2-')) {
      const parts = fileIdStr.split('-');
      const isTgpl2 = fileIdStr.startsWith('fallback-tgpl2-');
      const isInst = fileIdStr.includes('-installation-');
      const entityId = Number(parts[parts.length - 2]);
      const index = Number(parts[parts.length - 1]);
      
      if (isNaN(index) || (index < 1 || index > 3)) {
        throw new Error('Invalid fallback image slot index');
      }
      
      const table = isInst ? 'tgpl_installations' : isTgpl2 ? 'tgpl2_poles' : 'poles';
      const updateCol = `image_url_${index}`;
      const rowRes = await query(`SELECT ${updateCol} FROM ${table} WHERE id = $1`, [entityId]);
      if (rowRes.rows.length > 0 && rowRes.rows[0][updateCol]) {
        const url = rowRes.rows[0][updateCol];
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
      await query(`UPDATE ${table} SET ${updateCol} = NULL WHERE id = $1`, [entityId]);
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
    }

    // Clear column from pole/installation/switch_point
    try {
      if (file.entity_type === 'installation') {
        await query(`
          UPDATE tgpl_installations
          SET
            image_url_1 = CASE WHEN image_url_1 = $1 THEN NULL ELSE image_url_1 END,
            image_url_2 = CASE WHEN image_url_2 = $1 THEN NULL ELSE image_url_2 END,
            image_url_3 = CASE WHEN image_url_3 = $1 THEN NULL ELSE image_url_3 END
          WHERE id = $2
        `, [publicUrl, file.entity_id]);
      } else if (file.entity_type === 'pole') {
        if (String(projectId) === '4') {
          await query(`
            UPDATE tgpl2_poles
            SET
              image_url_1 = CASE WHEN image_url_1 = $1 THEN NULL ELSE image_url_1 END,
              image_url_2 = CASE WHEN image_url_2 = $1 THEN NULL ELSE image_url_2 END
            WHERE id = $2 AND project_id = $3
          `, [publicUrl, file.entity_id, Number(projectId)]);
        } else {
          await query(`
            UPDATE poles
            SET
              image_url_1 = CASE WHEN image_url_1 = $1 THEN NULL ELSE image_url_1 END,
              image_url_2 = CASE WHEN image_url_2 = $1 THEN NULL ELSE image_url_2 END,
              image_url_3 = CASE WHEN image_url_3 = $1 THEN NULL ELSE image_url_3 END
            WHERE id = $2
          `, [publicUrl, file.entity_id]);
        }
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
