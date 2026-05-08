const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { query } = require('../config/db');

async function run() {
  const seedSql = fs.readFileSync(path.join(__dirname, '../../sql/seed.sql'), 'utf8');
  try {
    console.log('Running seed.sql...');
    await query(seedSql);
    console.log('Database seeded successfully!');
  } catch (e) {
    console.error('Error seeding database:', e);
  }
}
run();
