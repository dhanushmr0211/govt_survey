const { addUserToProject } = require('../models/projectUserModel');

async function assign() {
  const result = await addUserToProject(4, 2, 'EMPLOYEE');
  console.log('Assigned:', result);
}

assign().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
