const excel = require('exceljs');
const {
  getWardsSummary,
  getWardSummary,
  getCcmsSummary,
  getSwitchPointDetails,
  getWardDetails,
  getPendingSubmissions,
  getConfirmedSubmissions,
  getTodaySubmissions,
  getEmployeeTracking,
  getMobileUserTracking,
  getMyStats,
  getReportData
} = require('../models/summary.model');

async function getWardsSummaryHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const summary = await getWardsSummary(Number(projectId));
    res.json({ wards: summary });
  } catch (error) {
    next(error);
  }
}

async function getWardDetailsHandler(req, res, next) {
  try {
    const { projectId, wardId } = req.params;
    const details = await getWardDetails(Number(projectId), Number(wardId));
    res.json({ details });
  } catch (error) {
    next(error);
  }
}

async function getWardSummaryHandler(req, res, next) {
  try {
    const { projectId, wardId } = req.params;
    const rows = await getWardSummary(Number(projectId), Number(wardId));
    res.json({ ccms: rows });
  } catch (error) {
    next(error);
  }
}

async function getCcmsSummaryHandler(req, res, next) {
  try {
    const { projectId, ccmsId } = req.params;
    const rows = await getCcmsSummary(Number(projectId), Number(ccmsId));
    res.json({ switch_points: rows });
  } catch (error) {
    next(error);
  }
}

async function getSwitchPointDetailsHandler(req, res, next) {
  try {
    const { projectId, switchPointId } = req.params;
    const poles = await getSwitchPointDetails(Number(projectId), Number(switchPointId));
    res.json({ poles });
  } catch (error) {
    next(error);
  }
}

async function getPendingSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { type = 'all', page = 1, limit = 50, fromDate = null, toDate = null } = req.query;
    const { rows, total } = await getPendingSubmissions(
      Number(projectId),
      type,
      Number(page),
      Number(limit),
      fromDate,
      toDate
    );
    res.json({ queue: rows, total, poles: rows });
  } catch (error) {
    next(error);
  }
}

async function getConfirmedSubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const { type = 'all', page = 1, limit = 50, fromDate = null, toDate = null } = req.query;
    const { rows, total } = await getConfirmedSubmissions(
      Number(projectId),
      type,
      Number(page),
      Number(limit),
      fromDate,
      toDate
    );
    res.json({ queue: rows, total, poles: rows });
  } catch (error) {
    next(error);
  }
}

async function getTodaySubmissionsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const today = await getTodaySubmissions(Number(projectId), userId);
    res.json({ poles: today });
  } catch (error) {
    next(error);
  }
}

async function getEmployeeTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const tracking = await getEmployeeTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) {
    next(error);
  }
}

async function getMobileUserTrackingHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const tracking = await getMobileUserTracking(Number(projectId));
    res.json({ tracking });
  } catch (error) {
    next(error);
  }
}

async function getMyStatsHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const stats = await getMyStats(Number(projectId), userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

async function downloadReportHandler(req, res, next) {
  try {
    const { projectId } = req.params;
    const data = await getReportData(Number(projectId));

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('TGPL-2 Survey Report');

    worksheet.columns = [
      { header: 'Ward Name', key: 'ward_name', width: 25 },
      { header: 'CCMS Number', key: 'ccms_number', width: 15 },
      { header: 'DTC Number', key: 'dtc_number', width: 15 },
      { header: 'DTC Capacity', key: 'dtc_capacity', width: 15 },
      { header: 'Switch Point Number', key: 'switch_point_number', width: 20 },
      { header: 'Meter Status', key: 'meter_status', width: 15 },
      { header: 'Meter Type', key: 'meter_type', width: 15 },
      { header: 'RR Number', key: 'rr_number', width: 15 },
      { header: 'Serial Number', key: 'serial_number', width: 15 },
      { header: 'Pole Number', key: 'pole_number', width: 15 },
      { header: 'Road Type', key: 'road_type', width: 15 },
      { header: 'Road Width (mtrs)', key: 'road_width', width: 15 },
      { header: 'Pole Defective', key: 'pole_defective', width: 15 },
      { header: 'Arm Deteriorated', key: 'arm_deteriorated', width: 18 },
      { header: 'Latitude', key: 'latitude', width: 15 },
      { header: 'Longitude', key: 'longitude', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Created By', key: 'user_name', width: 20 },
      { header: 'Confirmed By', key: 'confirmed_by_name', width: 20 },
      { header: 'Image URL 1', key: 'image_url_1', width: 35 },
      { header: 'Image URL 2', key: 'image_url_2', width: 35 }
    ];

    worksheet.getRow(1).font = { bold: true };

    data.forEach((row) => {
      worksheet.addRow({
        ...row,
        pole_defective: row.pole_defective ? 'Yes' : 'No',
        arm_deteriorated: row.arm_deteriorated ? 'Yes' : 'No',
        latitude: row.latitude ? Number(row.latitude) : '',
        longitude: row.longitude ? Number(row.longitude) : '',
        road_width: row.road_width ? Number(row.road_width) : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=tgpl2_survey_report_${projectId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWardsSummaryHandler,
  getWardSummaryHandler,
  getCcmsSummaryHandler,
  getSwitchPointDetailsHandler,
  getWardDetailsHandler,
  getPendingSubmissionsHandler,
  getConfirmedSubmissionsHandler,
  getTodaySubmissionsHandler,
  getEmployeeTrackingHandler,
  getMobileUserTrackingHandler,
  getMyStatsHandler,
  downloadReportHandler
};
