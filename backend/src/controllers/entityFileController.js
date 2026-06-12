const { z } = require('zod');
const entityFileService = require('../services/entityFileService');

const fileUploadSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.number().int().positive(),
});

async function uploadFileHandler(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    const data = fileUploadSchema.parse({
      entity_type: req.body.entity_type,
      entity_id: Number(req.body.entity_id),
    });

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const fileRecord = await entityFileService.uploadFile(
      projectId,
      data.entity_type,
      data.entity_id,
      req.file,
      Number(req.user.sub)
    );

    return res.status(201).json({ file: fileRecord });
  } catch (error) {
    return next(error);
  }
}

async function getFilesHandler(req, res, next) {
  try {
    const projectId = Number(req.params.projectId);
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
       return res.status(400).json({ message: 'entity_type and entity_id are required' });
    }

    const files = await entityFileService.getFilesForEntity(projectId, entity_type, Number(entity_id));
    return res.json({ files });
  } catch (error) {
    return next(error);
  }
}

async function deleteFileHandler(req, res, next) {
  try {
    const fileId = req.params.id;
    const projectId = req.params.projectId ? Number(req.params.projectId) : null;
    await entityFileService.deleteFile(fileId, projectId);
    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { uploadFileHandler, getFilesHandler, deleteFileHandler };
