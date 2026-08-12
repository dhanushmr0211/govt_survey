const { createCcms, getCcmsByWard, getLastCcmsByWard } = require('../models/ccms.model');

async function createCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const createdBy = req.user.id;
    const ccms = await createCcms(Number(projectId), req.body, createdBy);
    res.status(201).json({ ccms });
  } catch (error) {
    next(error);
  }
}

async function getCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ward_id } = req.query;
    if (!ward_id) return res.status(400).json({ message: 'ward_id is required' });
    const ccmsList = await getCcmsByWard(Number(projectId), Number(ward_id));
    res.json({ ccms: ccmsList });
  } catch (error) {
    next(error);
  }
}

async function getLastCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ward_id } = req.query;
    if (!ward_id) return res.status(400).json({ message: 'ward_id is required' });
    const ccms = await getLastCcmsByWard(Number(projectId), Number(ward_id));
    res.json({ ccms });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCcmsHandler,
  getCcmsHandler,
  getLastCcmsHandler
};
