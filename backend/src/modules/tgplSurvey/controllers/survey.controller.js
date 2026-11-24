const { getPoles, updatePole, confirmPole } = require('../models/pole.model');
const { getInstallations, updateInstallation, confirmInstallation } = require('../models/installation.model');
const {
  createCcmsRecord,
  getCcmsByWard,
  getLastCcmsByWard,
  getAllCcmsRecordsByWard,
  getCcmsById,
  confirmCcmsRecord,
  deleteCcmsRecord,
  updateCcmsRecord
} = require('../models/ccms.model');
const { query } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

function normalizeIdentifier(val) {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (/^\d+$/.test(trimmed)) {
    return String(Number(trimmed));
  }
  return trimmed.toLowerCase();
}

async function getPolesHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const poles = await getPoles(Number(projectId), status, Number(limit), Number(offset));
    res.json({ poles });
  } catch (error) {
    next(error);
  }
}

async function getInstallationsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const installations = await getInstallations(Number(projectId), status, Number(limit), Number(offset));
    res.json({ installations });
  } catch (error) {
    next(error);
  }
}

async function getCcmsListHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { ulb_id } = req.query; // ulb_id is the ward_id in TGPL context

    if (!ulb_id) {
      return res.status(400).json({ message: 'ulb_id is required' });
    }
    if (isNaN(Number(ulb_id))) {
      return res.status(400).json({ message: 'ulb_id must be a valid number' });
    }

    const result = await query(
      `SELECT ccms_number, MAX(id) as id 
       FROM (
         SELECT id, ccms_number, created_at FROM poles WHERE project_id = $1 AND ward_id = $2 AND ccms_number IS NOT NULL AND ccms_number != '' AND is_deleted = FALSE
         UNION ALL
         SELECT id, ccms_number, created_at FROM tgpl_installations WHERE project_id = $1 AND ward_id = $2 AND ccms_number IS NOT NULL AND ccms_number != '' AND is_deleted = FALSE
       ) combined_ccms
       GROUP BY ccms_number 
       ORDER BY MAX(created_at) DESC 
       LIMIT 10`,
      [Number(projectId), Number(ulb_id)]
    );

    const ccmsList = result.rows.map(row => ({
      id: row.id,
      ccms_number: row.ccms_number
    }));

    res.json({ ccms: ccmsList });
  } catch (error) {
    next(error);
  }
}

async function updatePoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const data = req.body;
    
    // Check if updating an installation vs pole
    const isInstallation = data.survey_type === 'installation' || data.type === 'installation';
    
    // Map ulb_id/ulb_name to ward_id/ward_number if present
    const parsedUlbId = (data.ulb_id !== undefined && data.ulb_id !== null && data.ulb_id !== '') ? Number(data.ulb_id) : null;
    if (parsedUlbId && parsedUlbId > 0) {
      data.ward_id = parsedUlbId;
    } else {
      delete data.ulb_id;
      delete data.ward_id;
    }
    if (data.ulb_name) data.ward_number = data.ulb_name;

    // Check table based on isInstallation or existing records
    let currentPole = null;
    let table = 'poles';
    
    const poleRes = await query(`SELECT ward_id, ccms_number, pole_number, 'survey' as survey_type, status, created_by FROM poles WHERE id = $1`, [Number(id)]);
    if (poleRes.rows.length > 0 && !isInstallation) {
      currentPole = poleRes.rows[0];
      table = 'poles';
    } else {
      const instRes = await query(`SELECT ward_id, ccms_number, pole_number, 'installation' as survey_type, status, created_by FROM tgpl_installations WHERE id = $1`, [Number(id)]);
      if (instRes.rows.length > 0) {
        currentPole = instRes.rows[0];
        table = 'tgpl_installations';
      } else if (poleRes.rows.length > 0) {
        currentPole = poleRes.rows[0];
        table = 'poles';
      }
    }

    if (!currentPole) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // Permission check for editing
    const isMasterAdmin = req.user?.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    const currentStatus = (currentPole.status || '').toLowerCase();

    if (!isMasterAdmin) {
      if (currentStatus === 'pending') {
        const isMobileSurveyor = req.projectRole === ROLES.MOBILE_USER;
        const isCreator = currentPole.created_by === req.user?.id;
        const canEditPending = permissions.section_i || (isMobileSurveyor && isCreator);
        if (!canEditPending) {
          return res.status(403).json({ message: 'Forbidden: You do not have permission to edit pending survey data (requires section i access or being the creator)' });
        }
      }
      if (currentStatus === 'confirmed' && !permissions.section_j) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit confirmed data (requires section j access)' });
      }
    }

    const checkWardId = data.ward_id || currentPole.ward_id;
    const checkCcmsNumber = data.ccms_number !== undefined ? data.ccms_number : currentPole.ccms_number;
    const checkPoleNumber = data.pole_number !== undefined ? data.pole_number : currentPole.pole_number;

    if (checkCcmsNumber && checkPoleNumber) {
      const ccmsClean = String(checkCcmsNumber).trim();
      const poleClean = String(checkPoleNumber).trim();
      const normCcms = normalizeIdentifier(ccmsClean);
      const normPole = normalizeIdentifier(poleClean);

      const existingRecords = await query(
        `SELECT id, ccms_number, pole_number FROM ${table} 
         WHERE project_id = $1 
           AND ward_id = $2 
           AND id != $3
           AND is_deleted = FALSE`,
        [Number(projectId), Number(checkWardId), Number(id)]
      );

      const existingCcmsRow = existingRecords.rows.find(row => normalizeIdentifier(row.ccms_number) === normCcms);
      if (existingCcmsRow) {
        if (data.ccms_number !== undefined) data.ccms_number = existingCcmsRow.ccms_number;
      } else {
        if (data.ccms_number !== undefined) data.ccms_number = ccmsClean;
      }

      const isDuplicate = existingRecords.rows.some(row => {
        return normalizeIdentifier(row.ccms_number) === normCcms &&
               normalizeIdentifier(row.pole_number) === normPole;
      });

      if (isDuplicate) {
        const typeStr = table === 'tgpl_installations' ? 'installation' : 'survey';
        return res.status(400).json({ 
          message: `Pole No. "${poleClean}" under CCMS "${data.ccms_number || checkCcmsNumber}" already has a submitted ${typeStr} record in this ward.`
        });
      }

      if (data.pole_number !== undefined) data.pole_number = poleClean;
    }

    let updated;
    if (table === 'tgpl_installations') {
      updated = await updateInstallation(id, projectId, data);
    } else {
      updated = await updatePole(id, projectId, data);
    }
    res.json({ pole: updated, installation: updated });
  } catch (error) {
    next(error);
  }
}

async function confirmPoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const userId = req.user.id;
    const surveyType = req.body?.survey_type || req.query?.survey_type || req.body?.type || req.query?.type;
    
    let confirmed = null;
    if (surveyType === 'ccms') {
      confirmed = await confirmCcmsRecord(id, projectId, userId);
    } else if (surveyType === 'installation') {
      confirmed = await confirmInstallation(id, projectId, userId);
      if (!confirmed) {
        confirmed = await confirmPole(id, projectId, userId);
      }
    } else if (surveyType === 'survey' || surveyType === 'pole') {
      confirmed = await confirmPole(id, projectId, userId);
      if (!confirmed) {
        confirmed = await confirmInstallation(id, projectId, userId);
      }
    } else {
      // Check which table has this record in PENDING status first
      const pendingInst = await query(
        `SELECT id FROM tgpl_installations WHERE id = $1 AND project_id = $2 AND status = 'PENDING' AND is_deleted IS NOT TRUE`,
        [id, projectId]
      );
      if (pendingInst.rows.length > 0) {
        confirmed = await confirmInstallation(id, projectId, userId);
      } else {
        const pendingPole = await query(
          `SELECT id FROM poles WHERE id = $1 AND project_id = $2 AND status = 'PENDING' AND is_deleted IS NOT TRUE`,
          [id, projectId]
        );
        if (pendingPole.rows.length > 0) {
          confirmed = await confirmPole(id, projectId, userId);
        } else {
          confirmed = await confirmPole(id, projectId, userId);
          if (!confirmed) {
            confirmed = await confirmInstallation(id, projectId, userId);
          }
        }
      }
    }

    if (!confirmed) {
      return res.status(404).json({ message: 'Submission record not found' });
    }

    res.json({ pole: confirmed, installation: confirmed });
  } catch (error) {
    next(error);
  }
}

async function validateMoveHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { type, id, ulb_id, switch_point_number, ccms_number } = req.body;

    const targetWardId = Number(ulb_id);
    const targetCcmsNum = ccms_number !== undefined ? ccms_number : switch_point_number;

    const wardRes = await query(`SELECT name FROM wards WHERE id = $1`, [targetWardId]);
    const targetWardName = wardRes.rows[0]?.name || 'N/A';

    const isInst = type === 'installation';
    const table = isInst ? 'tgpl_installations' : 'poles';

    const poleRes = await query(
      `SELECT p.pole_number, p.ward_id, w.name as ward_name, p.ccms_number 
       FROM ${table} p
       JOIN wards w ON p.ward_id = w.id
       WHERE p.id = $1 AND p.project_id = $2`,
      [id, projectId]
    );
    const pole = poleRes.rows[0];
    if (!pole) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const locationChanged =
      Number(pole.ward_id) !== targetWardId ||
      pole.ccms_number !== targetCcmsNum;

    if (!locationChanged) {
      return res.json({ shouldWarn: false });
    }

    if (!targetCcmsNum || targetCcmsNum === 'NO_CCMS') {
      return res.json({ shouldWarn: false });
    }

    const ccmsRes = await query(
      `SELECT id FROM ${table} 
       WHERE project_id = $1 AND ward_id = $2 AND ccms_number = $3 AND is_deleted IS NOT TRUE 
       LIMIT 1`,
      [projectId, targetWardId, targetCcmsNum]
    );

    if (ccmsRes.rows.length > 0) {
      return res.json({ shouldWarn: false });
    } else {
      return res.json({
        shouldWarn: true,
        action: 'create',
        message: `Pole No. "${pole.pole_number || 'N/A'}" is shifting from Ward "${pole.ward_name}" (CCMS #${pole.ccms_number || 'None'}) to target Ward "${targetWardName}" (CCMS #${targetCcmsNum || 'None'}).\n\nNo matching CCMS exists in the target ward. A new CCMS group will be created. Proceed?`
      });
    }
  } catch (error) {
    next(error);
  }
}

async function deletePoleHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.params;
    const userId = req.user.id;
    const surveyType = req.body?.survey_type || req.query?.survey_type || req.body?.type || req.query?.type;

    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (userEmail !== 'pratheekar1997@gmail.com' && userEmail !== 'prelectricals01@gmail.com') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete submissions.' });
    }

    if (surveyType === 'ccms') {
      await deleteCcmsRecord(id, projectId, userId);
      return res.json({ message: 'CCMS record successfully deleted.' });
    } else if (surveyType === 'installation') {
      await query(
        `UPDATE tgpl_installations 
         SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 
         WHERE id = $2 AND project_id = $3`,
        [userId, id, projectId]
      );
    } else if (surveyType === 'survey' || surveyType === 'pole') {
      await query(
        `UPDATE poles 
         SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 
         WHERE id = $2 AND project_id = $3`,
        [userId, id, projectId]
      );
    } else {
      const poleRes = await query(`SELECT id FROM poles WHERE id = $1 AND project_id = $2 AND is_deleted IS NOT TRUE`, [id, projectId]);
      if (poleRes.rows.length > 0) {
        await query(
          `UPDATE poles 
           SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 
           WHERE id = $2 AND project_id = $3`,
          [userId, id, projectId]
        );
      } else {
        await query(
          `UPDATE tgpl_installations 
           SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1 
           WHERE id = $2 AND project_id = $3`,
          [userId, id, projectId]
        );
      }
    }

    res.json({ message: 'Record successfully deleted.' });
  } catch (error) {
    next(error);
  }
}


async function createCcmsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const data = req.body;
    const userId = req.user.id;

    if (!data.ward_id) {
      return res.status(400).json({ error: 'ward_id is required', message: 'Ward is required' });
    }

    const trimStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');
    
    // Installed Pole Number must be numeric only
    const poleNum = trimStr(data.installed_pole_number);
    if (!poleNum || !/^\d+$/.test(poleNum)) {
      return res.status(400).json({ 
        error: 'installed_pole_number must be numbers only', 
        message: 'Installed Pole Number must contain numbers only' 
      });
    }

    // Required fields check
    const requiredFields = [
      'ccms_number', 'installed_pole_number', 'supply_input', 'ccms_phase',
      'dtc_number', 'rr_number', 'bescom_meter_sl_number', 'is_ct_meter',
      'bescom_meter_status', 'ccms_uid_no', 'ccms_meter_no', 'ccms_imei_no',
      'earthing_completed', 'ccms_landmark', 'ccms_meter_voltage',
      'ccms_meter_current', 'ccms_meter_pf', 'ccms_meter_power_kw',
      'bescom_meter_reading_no', 'bescom_meter_voltage', 'bescom_meter_current',
      'bescom_meter_pf', 'bescom_meter_power_kw'
    ];

    for (const f of requiredFields) {
      if (!trimStr(data[f])) {
        return res.status(400).json({ 
          error: `${f} is required`, 
          message: `Field "${f.replace(/_/g, ' ')}" is compulsory` 
        });
      }
    }

    // Check offline idempotency to prevent duplicate CCMS submissions on sync retries
    const offlineSubmissionId = data.offline_submission_id ? String(data.offline_submission_id).trim() : null;
    if (offlineSubmissionId) {
      try {
        const existingOffline = await query(
          `SELECT * FROM tgpl_ccms WHERE offline_submission_id = $1 AND is_deleted = FALSE LIMIT 1`,
          [offlineSubmissionId]
        );
        if (existingOffline.rows.length > 0) {
          const existing = existingOffline.rows[0];
          return res.status(200).json({ ccms: existing, id: existing.id, ...existing });
        }
      } catch (err) {
        console.warn('[CCMS] Offline check ignored if column migrating:', err.message);
      }
    }

    const ccmsRecord = await createCcmsRecord(projectId, data, userId);
    return res.status(201).json({ ccms: ccmsRecord, id: ccmsRecord.id, ...ccmsRecord });
  } catch (error) {
    console.error('[createCcmsHandler Error]', error);
    return res.status(500).json({
      error: 'Failed to create CCMS record',
      message: error.message || 'Internal server error while saving CCMS Survey'
    });
  }
}

async function getCcmsByWardHandler(req, res, next) {
  try {
    const { projectId, wardId } = req.params;
    const ccmsList = await getCcmsByWard(projectId, wardId);
    const lastCcms = await getLastCcmsByWard(projectId, wardId);
    const allCcmsRecords = await getAllCcmsRecordsByWard(projectId, wardId);
    res.json({ ccms: ccmsList, lastCcms, allCcms: allCcmsRecords });
  } catch (error) {
    next(error);
  }
}

async function getCcmsByIdHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const ccms = await getCcmsById(id, projectId);
    if (!ccms) {
      return res.status(404).json({ message: 'CCMS record not found' });
    }
    res.json({ ccms });
  } catch (error) {
    next(error);
  }
}

async function updateCcmsHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const data = req.body;
    const updated = await updateCcmsRecord(id, projectId, data);
    res.json({ ccms: updated });
  } catch (error) {
    next(error);
  }
}

async function confirmCcmsHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const userId = req.user.id;
    const confirmed = await confirmCcmsRecord(id, projectId, userId);
    res.json({ ccms: confirmed });
  } catch (error) {
    next(error);
  }
}

async function deleteCcmsHandler(req, res, next) {
  try {
    const { projectId, id } = req.params;
    const userId = req.user.id;
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (userEmail !== 'pratheekar1997@gmail.com' && userEmail !== 'prelectricals01@gmail.com') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete submissions.' });
    }
    await deleteCcmsRecord(id, projectId, userId);
    res.json({ message: 'CCMS record successfully deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPolesHandler,
  getInstallationsHandler,
  getCcmsListHandler,
  updatePoleHandler,
  confirmPoleHandler,
  validateMoveHandler,
  deletePoleHandler,
  createCcmsHandler,
  getCcmsByWardHandler,
  getCcmsByIdHandler,
  updateCcmsHandler,
  confirmCcmsHandler,
  deleteCcmsHandler
};

