const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { query } = require('../config/db');

async function run() {
  try {
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT');
    console.log('Column phone added successfully to users table');
  } catch (e) {
    console.error('Error adding column:', e);
  }
}
run();
