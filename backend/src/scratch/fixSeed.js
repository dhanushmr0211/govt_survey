const path = require('path');
const fs = require('fs');

const seedPath = path.join(__dirname, '../../sql/seed.sql');
let seedSql = fs.readFileSync(seedPath, 'utf8');

// Replace line 16
seedSql = seedSql.replace(
  'INSERT INTO ulbs (district_id, name, type) VALUES',
  'INSERT INTO ulbs (project_id, district_id, name, type) VALUES'
);

// Replace rows
// Pattern: ((SELECT id FROM ...), '...', '...'),
// Replacement: ((SELECT id FROM hescom), (SELECT id FROM ...), '...', '...'),
seedSql = seedSql.replace(
  /\(\(SELECT id FROM (\w+)\),/g,
  '((SELECT id FROM hescom), (SELECT id FROM $1),'
);

fs.writeFileSync(seedPath, seedSql);
console.log('seed.sql fixed!');
