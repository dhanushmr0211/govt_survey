const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

async function run() {
  const hash = await bcrypt.hash('password123', 12);
  try {
    const user = await userModel.create('Ganapathi', 'ganapathi@govtsurvey.co', hash, 'MASTER_ADMIN');
    console.log('User created successfully:', user);
  } catch (e) {
    console.error('Error creating user:', e);
  }
}
run();
