const imageModel = require('../models/imageModel');
const { buildObjectName, uploadBuffer, getSignedReadUrl, deleteObject } = require('../config/gcs');

async function uploadImage(recordId, file) {
  const objectName = buildObjectName(recordId, file.originalname);
  const uploaded = await uploadBuffer(file.buffer, objectName, file.mimetype);
  const image = await imageModel.create(recordId, uploaded.bucketName, uploaded.objectName, uploaded.contentType);
  return {
    ...image,
    signed_url: await getSignedReadUrl(image.object_name),
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
      signed_url: await getSignedReadUrl(image.object_name),
    }))
  );

  return { images: imagesWithUrls, total };
}

async function deleteImage(id) {
  const image = await imageModel.findById(id);

  if (image) {
    await deleteObject(image.object_name);
  }

  return imageModel.deleteById(id);
}

async function getAllImages() {
  return imageModel.findAll();
}

module.exports = { uploadImage, getImagesByRecord, deleteImage, getAllImages };
