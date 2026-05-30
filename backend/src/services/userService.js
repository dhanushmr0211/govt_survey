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

async function listUsersByProjects(projectIds) {
  return userModel.findUsersByProjects(projectIds);
}

async function changePassword(id, passwordHash) {
  return userModel.changePassword(id, passwordHash);
}

async function updateAvatar(id, avatarUrl) {
  return userModel.updateAvatar(id, avatarUrl);
}

async function updateDetails(id, name, email, phone, isBlocked) {
  return userModel.updateDetails(id, name, email, phone, isBlocked);
}

async function listAllUsersWithProjectDetails(projectId) {
  return userModel.findAllWithProjectDetails(projectId);
}

module.exports = { findUserById, findUserByEmail, createUser, listAllUsers, listMobileUsersByProjects, listUsersByProjects, touch, listUsersByProject, changePassword, updateAvatar, updateDetails, listAllUsersWithProjectDetails };
