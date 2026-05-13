const userModel = require('../models/userModel');

async function findUserById(id) {
  return userModel.findById(id);
}

async function findUserByEmail(email) {
  return userModel.findByEmail(email);
}

async function createUser(name, email, passwordHash, role, createdBy = null, phone = null) {
  return userModel.create(name, email, passwordHash, role, createdBy, phone);
}

async function listAllUsers() {
  return userModel.findAll();
}

async function listMobileUsersByProjects(projectIds) {
  return userModel.findMobileUsersByProjects(projectIds);
}

async function touch(id) {
  return userModel.touch(id);
}

async function listUsersByProject(projectId) {
  return userModel.findByProject(projectId);
}

module.exports = { findUserById, findUserByEmail, createUser, listAllUsers, listMobileUsersByProjects, touch, listUsersByProject };
