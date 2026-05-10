const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { ROLES } = require('../constants/roles');

async function createMaster() {
  try {
    const passwordHash = await bcrypt.hash('password123', 12);
    const email = `master${Date.now()}@example.com`;
    console.log('Creating Master Admin with email:', email);
    
    const user = await userService.createUser('Test Master', email, passwordHash, ROLES.MASTER_ADMIN, null, '1234567890');
    console.log('Master Admin created:', user);
  } catch (error) {
    console.error('Failed to create master:', error);
  }
  process.exit(0);
}

createMaster();
