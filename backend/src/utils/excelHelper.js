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
  'meter_serial_number',
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
    return '';
  }
  
  if (typeof val === 'number') {
    return val;
  }
  
  const trimmed = String(val).trim();
  
  // Matches valid positive integers or decimals
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  
  return trimmed;
}

module.exports = {
  NUMERIC_COLS,
  formatExcelValue
};
