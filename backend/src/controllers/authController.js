const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { env } = require('../config/env');
const userService = require('../services/userService');
const projectUserModel = require('../models/projectUserModel');
const { ROLES, normalizeRole, isKnownRole } = require('../constants/roles');
const { invalidateProjectAccess } = require('../middleware/projectAccess');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(20).optional(),
  role: z.string().trim().max(50).optional(),
  project_id: z.number().int().positive().optional(),
  projects: z.array(z.number().int().positive()).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await userService.findUserByEmail(data.email);

    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const selectedRole = isKnownRole(data.role) ? normalizeRole(data.role) : ROLES.MOBILE_USER;
    
    // Enforce creation hierarchy
    const creatorRole = req.user.role;
    const allowedCreations = {
      [ROLES.MASTER_ADMIN]: [ROLES.ADMIN, ROLES.CLIENT],
      [ROLES.ADMIN]: [ROLES.EMPLOYEE, ROLES.CLIENT],
      [ROLES.EMPLOYEE]: [ROLES.MOBILE_USER],
      [ROLES.CLIENT]: [],
      [ROLES.MOBILE_USER]: [],
    };

    if (!allowedCreations[creatorRole] || !allowedCreations[creatorRole].includes(selectedRole)) {
      return res.status(403).json({ message: `A ${creatorRole} does not have permission to create a ${selectedRole}` });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userService.createUser(data.name, data.email, passwordHash, selectedRole, Number(req.user.sub), data.phone);

    // Handle Project Assignment
    if (creatorRole === ROLES.MASTER_ADMIN && data.projects) {
      for (const pid of data.projects) {
        await projectUserModel.addUserToProject(user.id, pid, selectedRole);
      }
      invalidateProjectAccess(user.id);
    } else if (creatorRole === ROLES.ADMIN && data.project_id) {
      // Admin explicitly assigns project
      await projectUserModel.addUserToProject(user.id, data.project_id, selectedRole);
      invalidateProjectAccess(user.id);
    } else if (creatorRole === ROLES.EMPLOYEE) {
      // Employee passes down all their assigned projects to the new Mobile User
      const employeeProjectIds = await projectUserModel.getProjectIds(Number(req.user.sub));
      for (const pid of employeeProjectIds) {
        await projectUserModel.addUserToProject(user.id, pid, selectedRole);
      }
      invalidateProjectAccess(user.id);
    }

    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await userService.findUserByEmail(data.email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(data.password, user.password);

    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const role = normalizeRole(user.role);
    const token = jwt.sign(
      { sub: String(user.id), email: user.email, role, name: user.name },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const user = await userService.findUserById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await userService.listAllUsers();
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me, listUsers };