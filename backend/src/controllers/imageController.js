const { z } = require('zod');
const imageService = require('../services/imageService');
const surveyModel = require('../models/surveyModel');
const imageModel = require('../models/imageModel');
const { ROLES } = require('../constants/roles');

const imageUploadSchema = z.object({
  record_id: z.number().int().positive(),
});

const { canAccessProject } = require('../middleware/projectAccess');
const { parsePagination, paginationMeta } = require('../utils/pagination');

/**
 * Returns true when the authenticated user is allowed to manage resources
 * belonging to the given survey record.
 * Admins have unrestricted access.
 * Employees must be assigned to the project.
 * Mobile users must be assigned to the project AND own the record.
 */
async function canAccessRecord(req, recordId) {
  const record = await surveyModel.findById(recordId);
  if (!record) {
    return false;
  }

  // Must belong to the project (ADMIN bypasses this inside canAccessProject)
  const hasProjectAccess = await canAccessProject(Number(req.user.sub), req.user.role, record.project_id);
  if (!hasProjectAccess) {
    return false;
  }

  // Mobile users are further restricted to only their own records
  if (req.user.role === ROLES.MOBILE_USER) {
    return record.mobile_user_id === Number(req.user.sub);
  }

  return true;
}

async function uploadImage(req, res, next) {
  try {
    const data = imageUploadSchema.parse({ record_id: Number(req.body.record_id) });

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Ownership check
    const allowed = await canAccessRecord(req, data.record_id);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to upload images to this record' });
    }

    const image = await imageService.uploadImage(data.record_id, req.file);
    return res.status(201).json({ image });
  } catch (error) {
    return next(error);
  }
}

async function getImagesByRecord(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const recordId = Number(req.params.recordId);
    if (isNaN(recordId)) {
      return res.status(400).json({ message: 'Invalid record ID' });
    }

    const allowed = await canAccessRecord(req, recordId);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to view images for this record' });
    }

    const result = await imageService.getImagesByRecord(recordId, limit, offset);
    return res.json({
      images: result.images,
      pagination: paginationMeta(page, limit, result.total),
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteImage(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Look up the image to find the owning survey record
    const image = await imageModel.findById(id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Ownership check
    const allowed = await canAccessRecord(req, image.record_id);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to delete this image' });
    }

    await imageService.deleteImage(id);
    return res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { uploadImage, getImagesByRecord, deleteImage };

