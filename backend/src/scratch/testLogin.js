const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function run() {
  const result = await query('SELECT * FROM users WHERE email = $1', ['mobile@govtsurvey.co']);
  const user = result.rows[0];
  const match = await bcrypt.compare('password123', user.password);
  console.log('Password match:', match);
}
run();
