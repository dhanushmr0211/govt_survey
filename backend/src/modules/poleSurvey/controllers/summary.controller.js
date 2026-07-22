const { getDistrictSummary, getWardSummary, getWardDetails, getPendingSubmissions, getTodaySubmissions, getConfirmedSubmissions, getDeletedSubmissions, getMyStats, getEmployeeTracking, getMobileUserTracking, getAdminTracking, getReportData, getMyConfirmedStats } = require('../models/summary.model');
const { canAccessProject } = require('../../../middleware/projectAccess');
const { ROLES } = require('../../../constants/roles');
const ExcelJS = require('exceljs');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { getLocalDateString } = require('../../../utils/date');
const { NUMERIC_COLS, formatExcelValue } = require('../../../utils/excelHelper');

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

    if (!isMasterAdmin && !permissions?.section_a) {
      if (permissions?.section_b && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access the Summary section' });
      }
    }

    const summary = await getDistrictSummary(Number(projectId), date, mode, permissions?.district_scope, permissions?.ulb_scope, fromDate || null, toDate || null);
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
    const hasSectionA = permissions?.section_a;
    const hasSectionB = permissions?.section_b;
    
    const todayStr = getLocalDateString();
    const isRequestForToday = date === todayStr;

    if (!isMasterAdmin && !hasSectionA) {
      if (hasSectionB && isRequestForToday) {
        // OK
      } else {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access this section' });
      }
    }

    // Security Check: If user has ulb_scope, check if this ulbId is allowed
    if (!isMasterAdmin && permissions?.ulb_scope && Array.isArray(permissions?.ulb_scope) && permissions?.ulb_scope.length > 0) {
      if (!permissions?.ulb_scope.includes(Number(ulbId))) {
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

    if (!isMasterAdmin && !permissions?.section_a) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access ward details' });
    }

    // Security Check
    if (!isMasterAdmin && permissions?.ulb_scope && Array.isArray(permissions?.ulb_scope) && permissions?.ulb_scope.length > 0) {
      if (!permissions?.ulb_scope.includes(Number(ulbId))) {
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

    if (!isMasterAdmin && !permissions?.section_c && !permissions?.section_e && !permissions?.section_f && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access the pending queue' });
    }

    const { page = 1, limit = 50, userId, fromDate, toDate, dateField, type } = req.query;
    // For mobile users, force filtering by their own ID
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    if (isNaN(Number(projectId))) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    const { rows, total } = await getPendingSubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit), 
      filterUserId,
      permissions?.district_scope,
      permissions?.ulb_scope,
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

    if (!isMasterAdmin && !permissions?.section_b && !permissions?.section_c && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access today\'s submissions' });
    }

    const { page = 1, limit = 50, userId } = req.query;
    // For mobile users, force filtering by their own ID
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    const { rows, total } = await getTodaySubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit),
      filterUserId,
      permissions?.district_scope,
      permissions?.ulb_scope
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

    if (!isMasterAdmin && !permissions?.section_c && !permissions?.section_e && !permissions?.section_f && !isMobileUser) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access confirmed submissions' });
    }

    const { page = 1, limit = 50, userId, confirmedBy, fromDate, toDate, dateField, type } = req.query;
    // For mobile users, force filtering by their own ID
    const filterUserId = isMobileUser ? Number(req.user.sub) : (userId ? Number(userId) : null);

    const isEmployee = projectRole === ROLES.EMPLOYEE;
    const filterConfirmedBy = (isEmployee && !permissions?.section_e) ? Number(req.user.sub) : (confirmedBy ? Number(confirmedBy) : null);

    const { rows, total } = await getConfirmedSubmissions(
      Number(projectId), 
      Number(page), 
      Number(limit), 
      filterUserId, 
      filterConfirmedBy,
      permissions?.district_scope,
      permissions?.ulb_scope,
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
    
    if (!isMasterAdmin && !permissions?.section_e) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to employee tracking' });
    }

    const tracking = await getEmployeeTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function getAdminTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    
    if (!isMasterAdmin && !permissions?.section_k) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to admin tracking' });
    }

    const tracking = await getAdminTracking(Number(projectId));
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
    
    if (!isMasterAdmin && !permissions?.section_f) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to mobile user tracking' });
    }

    const tracking = await getMobileUserTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) { next(error); }
}

async function downloadReportHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { district, tillDate, ulbId, fromDate, toDate, confirmedBy } = req.query;
    
    const allowedProject = await canAccessProject(Number(req.user.sub), req.user.role, Number(projectId));
    if (!allowedProject) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
    }
    
    const permissions = req.projectSections || {};
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    if (!isMasterAdmin && !permissions?.section_g && !permissions?.section_e && !permissions?.section_k) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to download reports' });
    }

    // Scope enforcement: prevent scoped users from downloading data outside their allowed districts/ULBs
    const districtScope = (permissions && permissions.district_scope) || null;
    const ulbScope = (permissions && permissions.ulb_scope) || null;

    if (!isMasterAdmin && districtScope && Array.isArray(districtScope) && districtScope.length > 0) {
      if (district) {
        const requestedDistrict = Number(district);
        const allowed = districtScope.map(Number);
        if (!allowed.includes(requestedDistrict)) {
          return res.status(403).json({ message: 'Forbidden: You do not have access to the selected district' });
        }
      }
    }

    if (!isMasterAdmin && ulbScope && Array.isArray(ulbScope) && ulbScope.length > 0) {
      if (ulbId) {
        const requestedUlb = Number(ulbId);
        const allowed = ulbScope.map(Number);
        if (!allowed.includes(requestedUlb)) {
          return res.status(403).json({ message: 'Forbidden: You do not have access to the selected ULB' });
        }
      }
    }

    const data = await getReportData(
      Number(projectId), 
      district ? Number(district) : null,
      tillDate,
      ulbId ? Number(ulbId) : null,
      districtScope,
      ulbScope,
      fromDate || null,
      toDate || null,
      confirmedBy ? Number(confirmedBy) : null
    );
    console.log(`[REPORT] Switch Points: ${data.switchPoints.length}, Poles: ${data.poles.length}`);

    const tmpFile = path.join(os.tmpdir(), `report_${projectId}_${Date.now()}.xlsx`);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      filename: tmpFile,
      useStyles: true,
      useSharedStrings: true
    });
    
    // Switch Points Sheet
    const spSheet = workbook.addWorksheet('Switch Points');
    spSheet.columns = [
      { header: 'Sl#', key: 'sl_no', width: 10 },
      { header: 'Number', key: 'switch_point_number', width: 15 },
      { header: 'District', key: 'district_name', width: 15 },
      { header: 'ULB', key: 'ulb_name', width: 15 },
      { header: 'Ward', key: 'ward_number', width: 10 },
      { header: 'Type', key: 'switch_point_type', width: 15 },
      { header: 'Meter Exists', key: 'meter_exists', width: 12 },
      { header: 'Meter Type', key: 'meter_type', width: 15 },
      { header: 'RR Number', key: 'meter_rr_number', width: 15 },
      { header: 'Serial Number', key: 'meter_serial_number', width: 20 },
      { header: 'Meter Condition', key: 'meter_condition', width: 15 },
      { header: 'Image 1 URL', key: 'image_url_1', width: 40 },
      { header: 'Image 2 URL', key: 'image_url_2', width: 40 },
      { header: 'Latitude longitude', key: 'latitude_longitude', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'user_name', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Confirmed By', key: 'confirmed_by_name', width: 20 }
    ];
    
    // Header styling helper
    const styleHeaderRow = (sheet) => {
      const headerRow = sheet.getRow(1);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = {
          name: 'Calibri',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF002060' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    };

    styleHeaderRow(spSheet);
    spSheet.getRow(1).commit();
    
    const activeSpCols = NUMERIC_COLS.filter(key => 
      spSheet.columns.some(col => col.key === key)
    );

    data.switchPoints.forEach((sp, idx) => {
      const formattedSp = {};
      Object.keys(sp).forEach(key => {
        if (activeSpCols.includes(key)) {
          formattedSp[key] = formatExcelValue(sp[key]);
        } else {
          formattedSp[key] = sp[key];
        }
      });

      const latLong = sp.latitude && sp.longitude ? `${sp.latitude}, ${sp.longitude}` : (sp.latitude || sp.longitude || '');

      const row = spSheet.addRow({
        ...formattedSp,
        sl_no: idx + 1,
        meter_exists: sp.meter_exists ? 'Yes' : 'No',
        latitude_longitude: latLong,
        created_at: new Date(sp.created_at).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      });

      activeSpCols.forEach(key => {
        const cell = row.getCell(key);
        if (typeof cell.value === 'number') {
          cell.numFmt = Number.isInteger(cell.value) ? '0' : '0.##';
        }
      });

      row.commit();
    });
    spSheet.commit();
    
    // Poles Sheet
    const pSheet = workbook.addWorksheet('Poles');
    pSheet.columns = [
      { header: 'Sl#', key: 'sl_no', width: 10 },
      { header: 'SubDiv', key: 'sub_div', width: 15 },
      { header: 'Ward No#', key: 'ward_number', width: 12 },
      { header: 'Switch Point#', key: 'switch_point_number', width: 18 },
      { header: 'Conductor Type', key: 'conductor_type', width: 15 },
      { header: 'Pole No#', key: 'pole_number', width: 15 },
      { header: 'Pole Type', key: 'pole_type', width: 15 },
      { header: 'Pole Height', key: 'pole_height_mtrs', width: 12 },
      { header: 'Pole Condition', key: 'pole_condition', width: 15 },
      { header: 'Pole-Pole Distance (mtrs)', key: 'pole_to_pole_distance_mtrs', width: 24 },
      { header: 'ARM Type', key: 'arm_type', width: 15 },
      { header: 'ARM Status', key: 'arm_status', width: 15 },
      { header: 'ARM No#', key: 'present_arm_no', width: 15 },
      { header: 'ARM Length', key: 'present_arm_length_mtrs', width: 15 },
      { header: 'Lights No#', key: 'how_many_lights_in_pole', width: 15 },
      { header: 'Lights Mounting Height (mtrs)', key: 'light_mounting_height', width: 26 },
      { header: 'Lights Type', key: 'light_type', width: 15 },
      { header: 'Lights Capacity', key: 'light_capacity', width: 15 },
      { header: 'Lights Working', key: 'light_working_status', width: 15 },
      { header: 'Road Category', key: 'road_category', width: 15 },
      { header: 'Road Type', key: 'road_type', width: 15 },
      { header: 'Road Width (mtrs)', key: 'road_width_mtrs', width: 18 },
      { header: 'Earthing Exist', key: 'pole_earthing_exists', width: 15 },
      { header: 'Pole Image1', key: 'image_url_1', width: 40 },
      { header: 'Pole Image2', key: 'image_url_2', width: 40 },
      { header: 'Pole Image3', key: 'image_url_3', width: 40 },
      { header: 'Address', key: 'latitude_longitude', width: 25 },
      { header: 'Date', key: 'created_date', width: 15 },
      { header: 'Date-Time', key: 'created_at', width: 20 },
      { header: 'Submitter', key: 'user_name', width: 20 }
    ];

    styleHeaderRow(pSheet);
    pSheet.getRow(1).commit();
    
    const activePoleCols = NUMERIC_COLS.filter(key => 
      pSheet.columns.some(col => col.key === key)
    );

    data.poles.forEach((p, idx) => {
      const formattedPole = {};
      Object.keys(p).forEach(key => {
        if (activePoleCols.includes(key)) {
          formattedPole[key] = formatExcelValue(p[key]);
        } else {
          formattedPole[key] = p[key];
        }
      });

      const createdDateObj = new Date(p.created_at);
      const dateStr = p.created_at ? createdDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
      const dateTimeStr = p.created_at ? createdDateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) : '';
      const latLong = p.latitude && p.longitude ? `${p.latitude}, ${p.longitude}` : (p.latitude || p.longitude || '');

      const row = pSheet.addRow({
        ...formattedPole,
        sl_no: idx + 1,
        sub_div: p.ulb_name || p.district_name || '',
        latitude_longitude: latLong,
        created_date: dateStr,
        created_at: dateTimeStr
      });

      activePoleCols.forEach(key => {
        const cell = row.getCell(key);
        if (typeof cell.value === 'number') {
          cell.numFmt = Number.isInteger(cell.value) ? '0' : '0.##';
        }
      });

      row.commit();
    });
    pSheet.commit();
    
    await workbook.commit();

    // Send the completed file with Content-Length so Excel treats it as valid
    const stat = fs.statSync(tmpFile);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report_${projectId}_${district || 'all'}_${tillDate || 'all'}.xlsx`);
    res.setHeader('Content-Length', stat.size);
    
    const readStream = fs.createReadStream(tmpFile);
    readStream.pipe(res);
    readStream.on('end', () => fs.unlink(tmpFile, () => {}));
    readStream.on('error', (err) => { fs.unlink(tmpFile, () => {}); next(err); });
  } catch (error) {
    next(error);
  }
}

async function getDeletedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    
    const userEmail = (req.user?.email || '').toLowerCase().trim();
    if (userEmail !== 'pratheekar1997@gmail.com' && userEmail !== 'prelectricals01@gmail.com') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access the deleted queue' });
    }

    const { page = 1, limit = 50, fromDate, toDate, type } = req.query;
    const permissions = req.projectSections || {};

    if (isNaN(Number(projectId))) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    const { rows, total } = await getDeletedSubmissions(
      Number(projectId),
      Number(page),
      Number(limit),
      permissions?.district_scope,
      permissions?.ulb_scope,
      fromDate || null,
      toDate || null,
      type || null
    );
    res.json({ queue: rows, total });
  } catch (error) { next(error); }
}

async function getMyConfirmedStatsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.sub;
    
    const isMasterAdmin = req.user.role === ROLES.MASTER_ADMIN;
    const permissions = req.projectSections || {};
    const userProjectRole = req.projectRole;

    if (!isMasterAdmin) {
      const isAllowedRole = ['ADMIN', 'EMPLOYEE', 'CLIENT'].includes(userProjectRole);
      const hasSectionC = permissions?.section_c;
      if (!isAllowedRole || !hasSectionC) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to view confirmed stats' });
      }
    }

    const stats = await getMyConfirmedStats(Number(projectId), Number(userId));
    res.json({ stats });
  } catch (error) { next(error); }
}

module.exports = { getDistrictSummaryHandler, getWardSummaryHandler, getWardDetailsHandler, getPendingSubmissionsHandler, getTodaySubmissionsHandler, getConfirmedSubmissionsHandler, getDeletedSubmissionsHandler, getMyStatsHandler, getEmployeeTrackingHandler, getAdminTrackingHandler, getMobileUserTrackingHandler, downloadReportHandler, getMyConfirmedStatsHandler };
