const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { env } = require('../config/env');
const userService = require('../services/userService');
const projectUserModel = require('../models/projectUserModel');
const { ROLES, normalizeRole, isKnownRole } = require('../constants/roles');
const { invalidateProjectAccess } = require('../middleware/projectAccess');
const adminSectionAccessModel = require('../models/adminSectionAccessModel');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(20).optional(),
  role: z.string().trim().max(50).optional(),
  project_id: z.number().int().positive().optional(),
  projects: z.array(z.number().int().positive()).min(1, 'Please assign at least one project'),
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
});

const updateAccessSchema = z.object({
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
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
      [ROLES.ADMIN]: [ROLES.EMPLOYEE, ROLES.CLIENT, ROLES.MOBILE_USER],
      [ROLES.EMPLOYEE]: [ROLES.MOBILE_USER],
      [ROLES.CLIENT]: [],
      [ROLES.MOBILE_USER]: [],
    };

    if (!allowedCreations[creatorRole] || !allowedCreations[creatorRole].includes(selectedRole)) {
      return res.status(403).json({ message: `A ${creatorRole} does not have permission to create a ${selectedRole}` });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userService.createUser(data.name, data.email, passwordHash, selectedRole, req.user.sub ? Number(req.user.sub) : null, data.phone);

    // Save section access
    await adminSectionAccessModel.setSectionAccess(user.id, data.section_a || false, data.section_b || false, data.section_c || false, data.section_d || false, data.section_e || false, data.section_f || false, data.section_g || false, data.section_h || false);

    // Handle Project Assignment
    if (creatorRole === ROLES.MASTER_ADMIN && data.projects) {
      for (const pid of data.projects) {
        await projectUserModel.addUserToProject(user.id, pid, selectedRole);
      }
      invalidateProjectAccess(user.id);
    } else if (creatorRole === ROLES.ADMIN && (data.project_id || data.projects)) {
      const pids = data.projects || [data.project_id];
      for (const pid of pids) {
        await projectUserModel.addUserToProject(user.id, pid, selectedRole);
      }
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
    console.error('Error in register:', error);
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
    const sectionAccess = await adminSectionAccessModel.getSectionAccess(user.id);
    
    const token = jwt.sign(
      { 
        sub: String(user.id), 
        email: user.email, 
        role, 
        name: user.name,
        section_a: sectionAccess.section_a,
        section_b: sectionAccess.section_b,
        section_c: sectionAccess.section_c,
        section_d: sectionAccess.section_d,
        section_e: sectionAccess.section_e,
        section_f: sectionAccess.section_f,
        section_g: sectionAccess.section_g,
        section_h: sectionAccess.section_h
      },
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
        section_a: sectionAccess.section_a,
        section_b: sectionAccess.section_b,
        section_c: sectionAccess.section_c,
        section_d: sectionAccess.section_d,
        section_e: sectionAccess.section_e,
        section_f: sectionAccess.section_f,
        section_g: sectionAccess.section_g,
        section_h: sectionAccess.section_h,
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
        ...(await adminSectionAccessModel.getSectionAccess(user.id)),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    // Only Master Admin, Admin, and Employee can list users
    if (req.user.role !== ROLES.MASTER_ADMIN && req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.EMPLOYEE) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view users' });
    }

    const { projectId } = req.query;
    let users = [];
    
    if (projectId) {
      users = await userService.listUsersByProject(Number(projectId));
    } else {
      if (req.user.role === ROLES.MASTER_ADMIN || req.user.role === ROLES.ADMIN) {
        users = await userService.listAllUsers();
      } else if (req.user.role === ROLES.EMPLOYEE) {
        const employeeProjectIds = await projectUserModel.getProjectIds(Number(req.user.sub));
        if (employeeProjectIds.length > 0) {
          users = await userService.listMobileUsersByProjects(employeeProjectIds);
        }
      }
    }
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
}

async function updateAccess(req, res, next) {
  try {
    const { id } = req.params;
    const data = updateAccessSchema.parse(req.body);
    
    if (req.user.role !== ROLES.MASTER_ADMIN && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to update access' });
    }

    const existingAccess = await adminSectionAccessModel.getSectionAccess(Number(id));

    await adminSectionAccessModel.setSectionAccess(
      Number(id),
      data.section_a ?? existingAccess.section_a,
      data.section_b ?? existingAccess.section_b,
      data.section_c ?? existingAccess.section_c,
      data.section_d ?? existingAccess.section_d,
      data.section_e ?? existingAccess.section_e,
      data.section_f ?? existingAccess.section_f,
      data.section_g ?? existingAccess.section_g,
      data.section_h ?? existingAccess.section_h
    );

    await userService.touch(Number(id));

    return res.json({ message: 'Access updated successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me, listUsers, updateAccess };
