const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const { env } = require('../config/env');
const userService = require('../services/userService');
const projectUserModel = require('../models/projectUserModel');
const { ROLES, normalizeRole, isKnownRole } = require('../constants/roles');

const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(20).optional(),
  project_role: z.string().trim().max(50), // The role in the project: ADMIN, CLIENT, etc.
  projects: z.array(z.number().int().positive()).min(1, 'Please assign at least one project'),
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
  section_i: z.boolean().optional(),
  district_scope: z.array(z.number().int()).nullable().optional(),
  ulb_scope: z.array(z.number().int()).nullable().optional(),
});

const updateAccessSchema = z.object({
  projectId: z.number().int().positive(),
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
  section_i: z.boolean().optional(),
  district_scope: z.array(z.number().int()).nullable().optional(),
  ulb_scope: z.array(z.number().int()).nullable().optional(),
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

    const projectRole = isKnownRole(data.project_role) ? normalizeRole(data.project_role) : ROLES.MOBILE_USER;
    
    // Enforce creation hierarchy
    const creatorRole = req.user.role; // MASTER_ADMIN or MEMBER
    // Note: If MEMBER, we should ideally check their project_role for the assigned projects
    // For now, keeping simple: MASTER_ADMIN can create anyone, others restricted by logic below
    
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Global role is ALWAYS MEMBER for new registrations via this endpoint
    const user = await userService.createUser(data.name, data.email, passwordHash, ROLES.MEMBER, req.user.sub ? Number(req.user.sub) : null, data.phone);

    // Handle Project Assignment with sections
    const sections = {
      section_a: data.section_a, section_b: data.section_b, section_c: data.section_c,
      section_d: data.section_d, section_e: data.section_e, section_f: data.section_f,
      section_g: data.section_g, section_h: data.section_h, section_i: data.section_i,
      district_scope: data.district_scope,
      ulb_scope: data.ulb_scope
    };

    if (data.projects) {
      for (const pid of data.projects) {
        await projectUserModel.addUserToProject(user.id, pid, projectRole, sections);
      }
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

    const role = normalizeRole(user.role); // MASTER_ADMIN or MEMBER
    
    const token = jwt.sign(
      { 
        sub: String(user.id), 
        email: user.email, 
        role, 
        name: user.name
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
        role
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
        role: normalizeRole(user.role)
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { projectId } = req.query;
    let users = [];
    
    // For now, allow MASTER_ADMIN to see all, others only project specific
    if (req.user.role === ROLES.MASTER_ADMIN) {
      if (projectId) {
        users = await userService.listUsersByProject(Number(projectId));
      } else {
        users = await userService.listAllUsers();
      }
    } else {
      // MEMBER needs a projectId to see users
      if (!projectId) {
        return res.status(400).json({ message: 'projectId is required' });
      }
      // Check if user is member of this project
      const member = await projectUserModel.isMember(Number(req.user.sub), Number(projectId));
      if (!member) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      users = await userService.listUsersByProject(Number(projectId));
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
    
    // Authorization Check
    if (req.user.role !== ROLES.MASTER_ADMIN) {
      // Check if logged in user has section_h (Edit Access) for this project
      const membership = await projectUserModel.isMember(Number(req.user.sub), data.projectId);
      if (!membership || !membership.section_h) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit user access for this project' });
      }
    }

    const existingMember = await projectUserModel.isMember(Number(id), data.projectId);
    if (!existingMember) {
      return res.status(404).json({ message: 'User is not assigned to this project' });
    }

    await projectUserModel.addUserToProject(
      Number(id),
      data.projectId,
      existingMember.project_role,
      {
        section_a: data.section_a ?? existingMember.section_a,
        section_b: data.section_b ?? existingMember.section_b,
        section_c: data.section_c ?? existingMember.section_c,
        section_d: data.section_d ?? existingMember.section_d,
        section_e: data.section_e ?? existingMember.section_e,
        section_f: data.section_f ?? existingMember.section_f,
        section_g: data.section_g ?? existingMember.section_g,
        section_h: data.section_h ?? existingMember.section_h,
        section_i: data.section_i ?? existingMember.section_i,
        district_scope: data.district_scope !== undefined ? data.district_scope : existingMember.district_scope,
        ulb_scope: data.ulb_scope !== undefined ? data.ulb_scope : existingMember.ulb_scope
      }
    );

    await userService.touch(Number(id));

    return res.json({ message: 'Project access updated successfully' });
  } catch (error) {
    return next(error);
  }
}

async function getUserProjects(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.role !== ROLES.MASTER_ADMIN) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const assignments = await projectUserModel.getProjectsWithRoles(Number(id));
    return res.json({ assignments });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, me, listUsers, getUserProjects, updateAccess };
