const { query } = require('./src/config/db');

async function test() {
  try {
    console.log('🔍 Testing user projects...\n');

    // Get all users
    console.log('📋 All users:');
    const usersResult = await query('SELECT id, name, email, role FROM users WHERE is_deleted = FALSE');
    console.log(usersResult.rows);

    // Get all projects
    console.log('\n📋 All projects:');
    const projectsResult = await query('SELECT id, name, project_type FROM projects WHERE is_deleted IS NOT TRUE');
    console.log(projectsResult.rows);

    // Get all project assignments
    console.log('\n📋 Project assignments (project_users):');
    const assignResult = await query(`
      SELECT pu.user_id, pu.project_id, pu.project_role, u.name, u.email, p.name as project_name
      FROM project_users pu
      JOIN users u ON pu.user_id = u.id
      JOIN projects p ON pu.project_id = p.id
    `);
    console.log(assignResult.rows);

    // Check for specific user (sangamesh)
    console.log('\n🔎 Sangamesh user (if exists):');
    const sangameshResult = await query(`
      SELECT id, name, email, role FROM users WHERE email LIKE '%sangamesh%' OR name LIKE '%sangamesh%'
    `);
    if (sangameshResult.rows.length > 0) {
      const userId = sangameshResult.rows[0].id;
      console.log('User:', sangameshResult.rows[0]);
      
      console.log('\n📋 Projects for Sangamesh:');
      const sangameshProjects = await query(`
        SELECT p.id, p.name, p.project_type, pu.project_role
        FROM project_users pu
        JOIN projects p ON pu.project_id = p.id
        WHERE pu.user_id = $1 AND p.is_deleted IS NOT TRUE
      `, [userId]);
      console.log(`Found ${sangameshProjects.rows.length} projects:`, sangameshProjects.rows);
    } else {
      console.log('❌ Sangamesh not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

test();
