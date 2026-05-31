const { query } = require('../config/db');
const { searchUlbs } = require('../models/districtUlbModel');
const { createSwitchPoint } = require('../models/switchPointModel');
const { createPole } = require('../models/poleModel');
const { accessibleProjectIds } = require('../middleware/projectAccess');

// Helper to validate lat/lng
function isValidLatLng(lat, lng) {
  const l = Number(lat);
  const g = Number(lng);
  if (isNaN(l) || isNaN(g)) return false;
  if (l < -90 || l > 90) return false;
  if (g < -180 || g > 180) return false;
  return true;
}
async function searchUlbsHandler(req, res) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const ulbs = await searchUlbs(q);
    res.json({ ulbs });
  } catch (error) {
    console.error('Error searching ULBs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createSwitchPointHandler(req, res) {
  try {
    const { projectId } = req.params;
    const data = req.body;
    
    // Avoid trusting frontend project_id: Verify access
    const allowedProjects = await accessibleProjectIds(req.user.id, req.user.role);
    if (allowedProjects !== null && !allowedProjects.includes(Number(projectId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Remove status from frontend input
    delete data.status;

    // Add lat/lng bounds
    if (!isValidLatLng(data.latitude, data.longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude bounds' });
    }

    // Check for duplicate switch point number under the same ward and project/ulb
    const duplicateCheck = await query(
      `SELECT id FROM switch_points 
       WHERE project_id = $1 
         AND ulb_id = $2 
         AND TRIM(LOWER(ward_number)) = TRIM(LOWER($3)) 
         AND TRIM(LOWER(switch_point_number)) = TRIM(LOWER($4)) 
         AND is_deleted IS NOT TRUE`,
      [Number(projectId), Number(data.ulb_id), String(data.ward_number), String(data.switch_point_number)]
    );

    if (duplicateCheck.rows.length > 0) {
      const errMsg = `switch point ${data.switch_point_number} under this ward is already exists`;
      return res.status(400).json({ error: errMsg, message: errMsg });
    }

    data.project_id = Number(projectId);
    data.created_by = req.user?.id; // Assuming auth middleware sets req.user
    
    const newSwitchPoint = await createSwitchPoint(data);
    res.status(201).json(newSwitchPoint);
  } catch (error) {
    console.error('Error creating Switch Point:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPoleHandler(req, res) {
  try {
    const { projectId } = req.params;
    const data = req.body;
    
    // Avoid trusting frontend project_id: Verify access
    const allowedProjects = await accessibleProjectIds(req.user.id, req.user.role);
    if (allowedProjects !== null && !allowedProjects.includes(Number(projectId))) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    // Remove status from frontend input
    delete data.status;

    // Add lat/lng bounds
    if (!isValidLatLng(data.latitude, data.longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude bounds' });
    }

    data.project_id = Number(projectId);
    data.created_by = req.user?.id;
    
    if (Number(projectId) === 3) {
      if (!data.ccms_number) {
        return res.status(400).json({ error: 'ccms_number is required' });
      }
      const ccmsClean = String(data.ccms_number).trim();
      data.ccms_number = ccmsClean;

      const ccmsExists = await query(
        `SELECT DISTINCT ccms_number FROM poles 
         WHERE project_id = $1 
           AND ward_id = $2 
           AND TRIM(LOWER(ccms_number)) = TRIM(LOWER($3))
           AND is_deleted = FALSE`,
        [Number(projectId), Number(data.ward_id), ccmsClean]
      );
      
      if (ccmsExists.rows.length > 0) {
        data.ccms_number = ccmsExists.rows[0].ccms_number;
      }
    }

    if (Number(projectId) !== 3 && !data.switch_point_id) {
      return res.status(400).json({ error: 'switch_point_id is required' });
    }

    const newPole = await createPole(data);
    res.status(201).json(newPole);
  } catch (error) {
    console.error('Error creating Pole:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { searchUlbsHandler, createSwitchPointHandler, createPoleHandler };
