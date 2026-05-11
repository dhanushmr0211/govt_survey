const { query } = require('../config/db');

async function check() {
  try {
    const issues = await query('SELECT COUNT(*) FROM issues');
    const resolvedIssues = await query("SELECT COUNT(*) FROM issues WHERE status = 'RESOLVED'");
    const poles = await query('SELECT COUNT(*) FROM poles');
    const sps = await query('SELECT COUNT(*) FROM switch_points');
    
    console.log('Issues Total:', issues.rows[0].count);
    console.log('Issues Resolved:', resolvedIssues.rows[0].count);
    console.log('Poles:', poles.rows[0].count);
    console.log('Switch Points:', sps.rows[0].count);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

check();
