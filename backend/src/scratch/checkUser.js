const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { query } = require('../config/db');

async function run() {
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', ['mobile@govtsurvey.co']);
    console.log('User found:', result.rows[0]);
  } catch (e) {
    console.error(e);
  }
}
run();
