const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { query } = require('../config/db');

async function run() {
  try {
    const result = await query('SELECT * FROM projects');
    console.log('Projects:', result.rows);
  } catch (e) {
    console.error(e);
  }
}
run();
