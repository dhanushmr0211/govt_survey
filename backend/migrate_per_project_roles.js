const { pool } = require('./src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Phase 1: Updating project_users table ---');
    // Add section columns to project_users if they don't exist
    await client.query(`
      ALTER TABLE project_users 
      ADD COLUMN IF NOT EXISTS section_a BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_b BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_c BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_d BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_e BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_f BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_g BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS section_h BOOLEAN DEFAULT FALSE;
    `);

    console.log('--- Phase 2: Updating users.role type and values ---');
    // Change users.role to text to allow 'MEMBER' and update values
    await client.query(`ALTER TABLE users ALTER COLUMN role TYPE TEXT;`);
    await client.query(`UPDATE users SET role = 'MEMBER' WHERE role != 'MASTER_ADMIN';`);

    console.log('--- Phase 3: Migrating existing section data ---');
    // Copy section flags from admin_section_access into project_users for existing links
    await client.query(`
      UPDATE project_users pu
      SET 
        section_a = asa.section_a,
        section_b = asa.section_b,
        section_c = asa.section_c,
        section_d = asa.section_d,
        section_e = asa.section_e,
        section_f = asa.section_f,
        section_g = asa.section_g,
        section_h = asa.section_h
      FROM admin_section_access asa
      WHERE pu.user_id = asa.admin_id;
    `);

    console.log('--- Migration Successful ---');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    throw e;
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
