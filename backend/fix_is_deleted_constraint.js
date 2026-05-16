const { query, pool } = require('./src/config/db');

async function fixIsDeletedConstraints() {
  try {
    console.log('--- Database is_deleted Constraint Fix ---');

    // 1. Find all tables with is_deleted column in public schema
    const findTablesSql = `
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'is_deleted' 
      AND table_schema = 'public';
    `;
    
    const result = await query(findTablesSql);
    const tables = result.rows.map(r => r.table_name);
    
    if (tables.length === 0) {
      console.log('No tables found with is_deleted column.');
      return;
    }

    console.log(`Found ${tables.length} tables: ${tables.join(', ')}`);

    for (const table of tables) {
      console.log(`\nProcessing table: ${table}...`);
      
      // Update NULL to FALSE
      console.log(`- Updating NULL values to FALSE in ${table}...`);
      await query(`UPDATE ${table} SET is_deleted = FALSE WHERE is_deleted IS NULL;`);
      
      // Set DEFAULT FALSE
      console.log(`- Setting DEFAULT FALSE for is_deleted in ${table}...`);
      await query(`ALTER TABLE ${table} ALTER COLUMN is_deleted SET DEFAULT FALSE;`);
      
      // Set NOT NULL
      console.log(`- Setting NOT NULL constraint for is_deleted in ${table}...`);
      await query(`ALTER TABLE ${table} ALTER COLUMN is_deleted SET NOT NULL;`);
      
      console.log(`✓ Table ${table} fixed.`);
    }

    console.log('\n--- All tables processed successfully ---');

  } catch (err) {
    console.error('Error fixing constraints:', err);
  } finally {
    await pool.end();
  }
}

fixIsDeletedConstraints();
