const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');

async function run() {
  const hash = await bcrypt.hash('password123', 12);
  try {
    const user = await userModel.create('Mobile User', 'mobile@govtsurvey.co', hash, 'MOBILE_USER');
    console.log('Mobile User created successfully:', user);
  } catch (e) {
    console.error('Error creating user:', e);
  }
}
run();
