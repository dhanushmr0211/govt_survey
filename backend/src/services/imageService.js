const imageModel = require('../models/imageModel');
const storageProvider = require('./storage/storageProvider');

async function uploadImage(recordId, file) {
  const uploaded = await storageProvider.upload(file);
  const image = await imageModel.create(recordId, 'default', uploaded.fileKey, file.mimetype);
  return {
    ...image,
    signed_url: uploaded.url,
  };
}

async function getImagesByRecord(recordId, limit, offset) {
  const [images, total] = await Promise.all([
    imageModel.findByRecordId(recordId, limit, offset),
    imageModel.countByRecordId(recordId),
  ]);
  const imagesWithUrls = await Promise.all(
    images.map(async (image) => ({
      ...image,
      signed_url: await storageProvider.getPublicUrl(image.object_name),
    }))
  );

  return { images: imagesWithUrls, total };
}

async function deleteImage(id) {
  const image = await imageModel.findById(id);

  if (image) {
    await storageProvider.delete(image.object_name);
  }

  return imageModel.deleteById(id);
}

async function getAllImages() {
  return imageModel.findAll();
}

module.exports = { uploadImage, getImagesByRecord, deleteImage, getAllImages };
