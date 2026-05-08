const projectModel = require('../models/projectModel');

async function listProjects(limit, offset) {
  const [projects, total] = await Promise.all([
    projectModel.findAll(limit, offset),
    projectModel.countAll(),
  ]);
  return { projects, total };
}

async function listProjectsByIds(projectIds, limit, offset) {
  const [projects, total] = await Promise.all([
    projectModel.findByIds(projectIds, limit, offset),
    projectModel.countByIds(projectIds),
  ]);
  return { projects, total };
}

async function createProject(name, projectType, createdBy) {
  return projectModel.create(name, projectType, createdBy);
}

module.exports = { listProjects, listProjectsByIds, createProject };
