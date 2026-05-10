const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const adminSectionAccessModel = require('../models/adminSectionAccessModel');
const projectUserModel = require('../models/projectUserModel');
const { ROLES } = require('../constants/roles');

async function test() {
  try {
    const passwordHash = await bcrypt.hash('password123', 12);
    const email = `test${Date.now()}@example.com`;
    console.log('Creating user with email:', email);
    
    const user = await userService.createUser('Test User', email, passwordHash, ROLES.ADMIN, 1, '1234567890');
    console.log('User created:', user);
    
    const access = await adminSectionAccessModel.setSectionAccess(user.id, true, true, false);
    console.log('Access saved:', access);
    
    // Simulate project assignment
    const projects = [2]; // Assume project 2 exists
    for (const pid of projects) {
      console.log('Assigning project:', pid);
      await projectUserModel.addUserToProject(user.id, pid, ROLES.ADMIN);
    }
    console.log('Projects assigned');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  process.exit(0);
}

test();
