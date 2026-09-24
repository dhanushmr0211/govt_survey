/**
 * List of database/report column keys that should be formatted and sorted
 * as numeric values (integers or decimals) in Excel if they contain only numeric text.
 */
const NUMERIC_COLS = [
  'pole_number',
  'switch_point_number',
  'ccms_number',
  'pole_height',
  'pole_height_mtrs',
  'pole_to_pole_distance',
  'pole_to_pole_distance_mtrs',
  'present_arm_no',
  'present_arm_length',
  'present_arm_length_mtrs',
  'req_arm_length',
  'req_arm_number',
  'how_many_lights_in_pole',
  'req_led_lights_no',
  'road_width_mtrs',
  'light_mounting_height',
  'ward_number',
  'dtc_number',
  'light_capacity',
  'light_capacity_2',
  'light_capacity_3',
  'light_capacity_4',
  'light_capacity_5',
  'light_capacity_6',
  'light_wattage',
  'light_wattage_2',
  'light_wattage_3',
  'light_wattage_4',
  'light_wattage_5',
  'light_wattage_6',
  'req_led_wattage'
];

/**
 * Trims and formats a value for Excel cell.
 * If the value is a string that represents a valid number (integer or decimal),
 * it returns it as a JavaScript Number.
 * Otherwise, it returns it as a trimmed string (or empty string for null/undefined).
 * 
 * @param {any} val 
 * @returns {string|number}
 */
function formatExcelValue(val) {
  if (val === null || val === undefined) {
    return 'NA';
  }
  
  if (typeof val === 'number') {
    return isNaN(val) ? 'NA' : val;
  }
  
  const trimmed = String(val).trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'NULL' || trimmed.toUpperCase() === 'UNDEFINED') {
    return 'NA';
  }
  
  // Matches valid positive or negative integers or decimals
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    return isNaN(num) ? 'NA' : num;
  }
  
  return trimmed;
}

/**
 * Ensures all empty, null, or undefined cells in an ExcelJS worksheet row are set to "NA".
 * Also applies proper number formatting ('0' or '0.##') to numeric cells.
 * 
 * @param {object} row - ExcelJS row object
 * @param {Array<{key: string}>} columns - Worksheet columns array
 * @param {string[]} activeNumericCols - List of keys that are numeric
 */
function sanitizeExcelRow(row, columns = [], activeNumericCols = []) {
  if (activeNumericCols && activeNumericCols.length > 0) {
    activeNumericCols.forEach(key => {
      const cell = row.getCell(key);
      if (typeof cell.value === 'number') {
        cell.numFmt = Number.isInteger(cell.value) ? '0' : '0.##';
      }
    });
  }

  if (columns && columns.length > 0) {
    columns.forEach(col => {
      const cell = row.getCell(col.key);
      if (
        cell.value === null ||
        cell.value === undefined ||
        cell.value === '' ||
        (typeof cell.value === 'string' && (
          cell.value.trim() === '' || 
          cell.value.trim().toUpperCase() === 'NULL' || 
          cell.value.trim().toUpperCase() === 'UNDEFINED'
        ))
      ) {
        cell.value = 'NA';
      }
    });
  }
}

module.exports = {
  NUMERIC_COLS,
  formatExcelValue,
  sanitizeExcelRow
};
