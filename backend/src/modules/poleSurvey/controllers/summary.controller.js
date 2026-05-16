const { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking, getReportData } = require('../models/summary.model');
const { canAccessProject } = require('../../../middleware/projectAccess');
const ExcelJS = require('exceljs');

async function getDistrictSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date, mode } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;
    const hasSectionB = user.section_b;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    const summary = await getDistrictSummary(Number(projectId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardSummaryHandler(req, res, next) {
  try {
    const { ulbId } = req.params;
    const { date, mode } = req.query;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;
    const hasSectionB = user.section_b;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    const summary = await getWardSummary(Number(ulbId), date, mode);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardDetailsHandler(req, res, next) {
  try {
    const { ulbId, wardNumber } = req.params;
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = user.section_a;

    if (!isMasterAdmin && !hasSectionA) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const details = await getWardDetails(Number(ulbId), wardNumber);
    res.json({ details });
  } catch (error) { next(error); }
}

async function getPendingSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50, userId } = req.query;
    if (isNaN(Number(projectId))) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    const { rows, total } = await getPendingSubmissions(Number(projectId), Number(page), Number(limit), userId ? Number(userId) : null);
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getTodaySubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionB = user.section_b;
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionB && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50 } = req.query;
    const { rows, total } = await getTodaySubmissions(Number(projectId), Number(page), Number(limit));
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getConfirmedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionC = user.section_c;

    if (!isMasterAdmin && !hasSectionC) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
    }

    const { page = 1, limit = 50, userId, confirmedBy } = req.query;
    const { rows, total } = await getConfirmedSubmissions(Number(projectId), Number(page), Number(limit), userId ? Number(userId) : null, confirmedBy ? Number(confirmedBy) : null);
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getMyStatsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.sub;
    
    const stats = await getMyStats(Number(projectId), Number(userId));
    res.json({ stats });
  } catch (error) { next(error); }
}

async function getEmployeeTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    
    if (!isMasterAdmin && !user.section_e) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to employee tracking' });
    }

    const tracking = await getEmployeeTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function getMobileUserTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const user = req.user;
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    
    if (!isMasterAdmin && !user.section_f) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to mobile user tracking' });
    }

    const tracking = await getMobileUserTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function downloadReportHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { district, tillDate, ulbId } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const data = await getReportData(Number(projectId), district ? Number(district) : null, tillDate, ulbId ? Number(ulbId) : null);
    console.log(`[REPORT] Switch Points: ${data.switchPoints.length}, Poles: ${data.poles.length}`);
    
    const workbook = new ExcelJS.Workbook();
    
    // Switch Points Sheet
    const spSheet = workbook.addWorksheet('Switch Points');
    spSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Number', key: 'switch_point_number', width: 15 },
      { header: 'District', key: 'district_name', width: 15 },
      { header: 'ULB', key: 'ulb_name', width: 15 },
      { header: 'Ward', key: 'ward_number', width: 10 },
      { header: 'Type', key: 'switch_point_type', width: 15 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Meter Exists', key: 'meter_exists', width: 12 },
      { header: 'Meter Type', key: 'meter_type', width: 15 },
      { header: 'RR Number', key: 'meter_rr_number', width: 15 },
      { header: 'Serial Number', key: 'meter_serial_number', width: 20 },
      { header: 'Meter Condition', key: 'meter_condition', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'user_name', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];
    
    data.switchPoints.forEach(sp => {
      spSheet.addRow({
        ...sp,
        meter_exists: sp.meter_exists ? 'Yes' : 'No',
        created_at: new Date(sp.created_at).toLocaleString()
      });
    });
    
    // Poles Sheet
    const pSheet = workbook.addWorksheet('Poles');
    pSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Number', key: 'pole_number', width: 15 },
      { header: 'Switch Point', key: 'switch_point_number', width: 15 },
      { header: 'District', key: 'district_name', width: 15 },
      { header: 'ULB', key: 'ulb_name', width: 15 },
      { header: 'Ward', key: 'ward_number', width: 10 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Conductor Type', key: 'conductor_type', width: 15 },
      { header: 'Type', key: 'pole_type', width: 15 },
      { header: 'Height (m)', key: 'pole_height_mtrs', width: 12 },
      { header: 'Condition', key: 'pole_condition', width: 15 },
      { header: 'Distance (m)', key: 'pole_to_pole_distance_mtrs', width: 12 },
      { header: 'Arm Type', key: 'arm_type', width: 15 },
      { header: 'Arm Status', key: 'arm_status', width: 15 },
      { header: 'Arm No', key: 'present_arm_no', width: 15 },
      { header: 'Arm Length (m)', key: 'present_arm_length_mtrs', width: 15 },
      { header: 'Lights Count', key: 'how_many_lights_in_pole', width: 15 },
      { header: 'Mounting Height', key: 'light_mounting_height', width: 15 },
      { header: 'Light Type', key: 'light_type', width: 15 },
      { header: 'Light Capacity', key: 'light_capacity', width: 15 },
      { header: 'Working Status', key: 'light_working_status', width: 15 },
      { header: 'Road Category', key: 'road_category', width: 15 },
      { header: 'Road Type', key: 'road_type', width: 15 },
      { header: 'Road Width (m)', key: 'road_width_mtrs', width: 15 },
      { header: 'Earthing Exists', key: 'pole_earthing_exists', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'user_name', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 }
    ];
    
    data.poles.forEach(p => {
      pSheet.addRow({
        ...p,
        created_at: new Date(p.created_at).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${projectId}_${district || 'all'}_${tillDate || 'all'}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
}

module.exports = { getDistrictSummaryHandler, getWardSummaryHandler, getWardDetailsHandler, getPendingSubmissionsHandler, getTodaySubmissionsHandler, getConfirmedSubmissionsHandler, getMyStatsHandler, getEmployeeTrackingHandler, getMobileUserTrackingHandler, downloadReportHandler };
