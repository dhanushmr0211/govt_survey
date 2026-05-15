const { pool } = require('./src/config/db');

async function enableTrgm() {
  try {
    console.log('Enabling pg_trgm extension...');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    
    console.log('Creating gin trigram index on ulbs.name...');
    await pool.query('CREATE INDEX IF NOT EXISTS ulb_name_trgm_idx ON ulbs USING gin (name gin_trgm_ops);');
    
    console.log('Successfully enabled pg_trgm and created the index.');
  } catch (error) {
    console.error('Error enabling pg_trgm:', error);
  } finally {
    await pool.end();
  }
}

enableTrgm();
