const {
  getDistrictSummary,
  getWardSummary,
  getWardDetails,
  getPendingSubmissions,
  getTodaySubmissions,
  getConfirmedSubmissions,
  getMyStats,
  getEmployeeTracking,
  getMobileUserTracking,
  getReportData
} = require('../models/summary.model');
const { canAccessProject } = require('../../../middleware/projectAccess');
const { ROLES } = require('../../../constants/roles');
const ExcelJS = require('exceljs');
const { getLocalDateString } = require('../../../utils/date');

async function getDistrictSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date, mode, fromDate, toDate } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    
    const todayStr = getLocalDateString();
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !permissions.section_a) {
      if (permissions.section_b && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access the Summary section' });
      }
    }

    const summary = await getDistrictSummary(Number(projectId), date, mode, permissions.district_scope, permissions.ulb_scope, fromDate || null, toDate || null);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardSummaryHandler(req, res, next) {
  try {
    const { ulbId } = req.params;
    const { date, mode, fromDate, toDate } = req.query;
    
    const user = req.user;
    const permissions = req.projectSections || {};
    const isMasterAdmin = user.role === 'MASTER_ADMIN';
    const hasSectionA = permissions.section_a;
    const hasSectionB = permissions.section_b;
    
    const todayStr = getLocalDateString();
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    if (!isMasterAdmin && permissions.ulb_scope && Array.isArray(permissions.ulb_scope) && permissions.ulb_scope.length > 0) {
      if (!permissions.ulb_scope.includes(Number(ulbId))) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access data for this ULB' });
      }
    }

    const summary = await getWardSummary(Number(ulbId), date, mode, fromDate || null, toDate || null);
    res.json({ summary });
  } catch (error) { next(error); }
}

async function getWardDetailsHandler(req, res, next) {
  try {
    const { ulbId, wardNumber } = req.params;
    const { date, mode, fromDate, toDate } = req.query;
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};

    if (!isMasterAdmin && !permissions.section_a) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access ward details' });
    }

    if (!isMasterAdmin && permissions.ulb_scope && Array.isArray(permissions.ulb_scope) && permissions.ulb_scope.length > 0) {
      if (!permissions.ulb_scope.includes(Number(ulbId))) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access data for this ULB' });
      }
    }

    const details = await getWardDetails(
      Number(ulbId), 
      wardNumber, 
      date || null, 
      mode || 'exact', 
      fromDate || null, 
      toDate || null
    );
    res.json({ details });
  } catch (error) { next(error); }
}

async function getPendingSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const projectRole = req.projectRole || req.user.role;
    const isMobileUser = projectRole === ROLES.MOBILE_USER;
    const permissions = req.projectSections || {};

    if (!isMasterAdmin && !permissions.section_c && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access the pending queue' });
    }

    const { page = 1, limit = 50, userId, fromDate, toDate, dateField, type } = req.query;
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    if (isNaN(Number(projectId))) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    const { rows, total } = await getPendingSubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit), 
      filterUserId,
      permissions.district_scope,
      permissions.ulb_scope,
      fromDate || null,
      toDate || null,
      dateField || 'created_at',
      type || null
    );
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
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const projectRole = req.projectRole || req.user.role;
    const isMobileUser = projectRole === ROLES.MOBILE_USER;
    const permissions = req.projectSections || {};

    if (!isMasterAdmin && !permissions.section_b && !permissions.section_c && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access today\'s submissions' });
    }

    const { page = 1, limit = 50, userId } = req.query;
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    const { rows, total } = await getTodaySubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit),
      filterUserId,
      permissions.district_scope,
      permissions.ulb_scope
    );
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getConfirmedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const projectRole = req.projectRole || req.user.role;
    const isMobileUser = projectRole === ROLES.MOBILE_USER;
    const permissions = req.projectSections || {};

    if (!isMasterAdmin && !permissions.section_c && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access confirmed submissions' });
    }

    const { page = 1, limit = 50, userId, confirmedBy, fromDate, toDate, dateField, type } = req.query;
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    const isEmployee = projectRole === ROLES.EMPLOYEE;
    const filterConfirmedBy = isEmployee ? Number(req.user.sub) : (confirmedBy ? Number(confirmedBy) : null);

    const { rows, total } = await getConfirmedSubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit), 
      filterUserId, 
      filterConfirmedBy,
      permissions.district_scope,
      permissions.ulb_scope,
      fromDate || null,
      toDate || null,
      dateField || 'created_at',
      type || null
    );
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getMyStatsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { date } = req.query;
    const userId = req.user.sub;
    
    const stats = await getMyStats(Number(projectId), Number(userId), date || null);
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
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    
    if (!isMasterAdmin && !permissions.section_e) {
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
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    
    if (!isMasterAdmin && !permissions.section_f) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to mobile user tracking' });
    }

    const tracking = await getMobileUserTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function downloadReportHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { tillDate, ulbId, fromDate, toDate } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const permissions = req.projectSections || {};
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    if (!isMasterAdmin && !permissions.section_g) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to download reports' });
    }

    const data = await getReportData(
      Number(projectId), 
      null,
      tillDate,
      ulbId ? Number(ulbId) : null,
      null,
      permissions.ulb_scope,
      fromDate || null,
      toDate || null
    );
    console.log(`[TGPL REPORT] Poles: ${data.poles.length}`);
    
    const workbook = new ExcelJS.Workbook();
    
    // Poles Sheet (TGPL only has Poles, no Switch Points)
    const pSheet = workbook.addWorksheet('Poles');
    pSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Number', key: 'pole_number', width: 15 },
      { header: 'District', key: 'district_name', width: 15 },
      { header: 'Ward / ULB Name', key: 'ulb_name', width: 15 },
      { header: 'DTC Number', key: 'dtc_number', width: 15 },
      { header: 'DTC Capacity', key: 'dtc_capacity', width: 15 },
      { header: 'CCMS Number', key: 'ccms_number', width: 15 },
      { header: 'Meter Type', key: 'meter_type', width: 15 },
      { header: 'Meter RR Number', key: 'meter_rr_number', width: 15 },
      { header: 'Meter Serial Number', key: 'meter_serial_number', width: 20 },
      { header: 'Meter Dimensional Status', key: 'meter_dimensional_status', width: 20 },
      { header: 'Conductor Type', key: 'conductor_type', width: 15 },
      { header: 'Type', key: 'pole_type', width: 15 },
      { header: 'Height', key: 'pole_height', width: 12 },
      { header: 'Distance', key: 'pole_to_pole_distance', width: 15 },
      { header: 'Arm Type', key: 'arm_type', width: 15 },
      { header: 'Arm Status', key: 'arm_status', width: 15 },
      { header: 'Present Arm No', key: 'present_arm_no', width: 15 },
      { header: 'Present Arm Length', key: 'present_arm_length', width: 15 },
      { header: 'How Many Lights in Pole', key: 'how_many_lights_in_pole', width: 15 },
      { header: 'Light Mounting Height', key: 'light_mounting_height', width: 15 },
      { header: 'Light 1 Type', key: 'light_type', width: 15 },
      { header: 'Light 1 Capacity', key: 'light_capacity', width: 15 },
      { header: 'Light 2 Type', key: 'light_type_2', width: 15 },
      { header: 'Light 2 Capacity', key: 'light_capacity_2', width: 15 },
      { header: 'Light Working Status', key: 'light_working_status', width: 15 },
      { header: 'Road Category', key: 'road_category', width: 15 },
      { header: 'Road Type', key: 'road_type', width: 15 },
      { header: 'Road Width (m)', key: 'road_width_mtrs', width: 15 },
      { header: 'Pole Earthing Exists', key: 'pole_earthing_exists', width: 15 },
      { header: 'Image 1 URL', key: 'image_url_1', width: 40 },
      { header: 'Image 2 URL', key: 'image_url_2', width: 40 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'user_name', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Req Arm Number', key: 'req_arm_number', width: 15 },
      { header: 'Req Arm Length', key: 'req_arm_length', width: 15 },
      { header: 'Req LED Lights No', key: 'req_led_lights_no', width: 15 },
      { header: 'Req LED Wattage', key: 'req_led_wattage', width: 15 },
      { header: 'Req Dedicated Wire', key: 'req_dedicated_wire', width: 15 }
    ];
    
    // Header styling
    const headerRow = pSheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    
    data.poles.forEach(p => {
      pSheet.addRow({
        ...p,
        created_at: new Date(p.created_at).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_tgpl_${projectId}_${tillDate || 'all'}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
}

module.exports = {
  getDistrictSummaryHandler,
  getWardSummaryHandler,
  getWardDetailsHandler,
  getPendingSubmissionsHandler,
  getTodaySubmissionsHandler,
  getConfirmedSubmissionsHandler,
  getMyStatsHandler,
  getEmployeeTrackingHandler,
  getMobileUserTrackingHandler,
  downloadReportHandler
};
