const { pool } = require('./src/config/db');

async function runUpdate() {
  try {
    console.log("Connecting to PostgreSQL database...");
    console.log("Renaming 'HESCOM Survey Project' to 'I DECK Survey Project' in projects table...");
    
    const result = await pool.query(
      "UPDATE projects SET name = 'I DECK Survey Project' WHERE name = 'HESCOM Survey Project';"
    );
    
    console.log(`Database update complete. Rows updated: ${result.rowCount}`);
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await pool.end();
  }
}

runUpdate();
