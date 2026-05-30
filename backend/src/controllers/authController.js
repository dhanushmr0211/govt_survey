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
  section_j: z.boolean().optional(),
  district_scope: z.array(z.number().int()).nullable().optional(),
  ulb_scope: z.array(z.number().int()).nullable().optional(),
});

const updateAccessSchema = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  is_blocked: z.boolean().optional(),
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
  section_i: z.boolean().optional(),
  section_j: z.boolean().optional(),
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
    
    // Enforce creation hierarchy & permission inheritance
    const creatorRole = req.user.role; // MASTER_ADMIN or MEMBER
    if (creatorRole !== ROLES.MASTER_ADMIN && data.projects) {
      const sectionsList = ['section_a', 'section_b', 'section_c', 'section_d', 'section_e', 'section_f', 'section_g', 'section_h', 'section_i', 'section_j'];
      for (const pid of data.projects) {
        const creatorMembership = await projectUserModel.isMember(Number(req.user.sub), pid);
        if (!creatorMembership) {
          return res.status(403).json({ message: `Forbidden: You do not have access to project ID ${pid}` });
        }

        // Role hierarchy enforcement
        const callerProjectRole = creatorMembership.project_role;
        if (callerProjectRole === ROLES.CLIENT && ![ROLES.EMPLOYEE, ROLES.MOBILE_USER].includes(projectRole)) {
          return res.status(403).json({ message: 'Forbidden: Clients can only create Employee or Mobile User roles' });
        }
        if (callerProjectRole === ROLES.EMPLOYEE && projectRole !== ROLES.MOBILE_USER) {
          return res.status(403).json({ message: 'Forbidden: Employees can only create Mobile Users' });
        }
        if (callerProjectRole === ROLES.MOBILE_USER) {
          return res.status(403).json({ message: 'Forbidden: Mobile Users cannot create other users' });
        }

        for (const sec of sectionsList) {
          if (data[sec] === true && !creatorMembership[sec]) {
            return res.status(403).json({ message: `Forbidden: You cannot grant '${sec.replace('section_', 'section ')}' permission as you do not possess it.` });
          }
        }
      }
    }
    
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Global role is ALWAYS MEMBER for new registrations via this endpoint
    const user = await userService.createUser(data.name, data.email, passwordHash, ROLES.MEMBER, req.user.sub ? Number(req.user.sub) : null, data.phone);

    // Handle Project Assignment with sections
    const sections = {
      section_a: data.section_a, section_b: data.section_b, section_c: data.section_c,
      section_d: data.section_d, section_e: data.section_e, section_f: data.section_f,
      section_g: data.section_g, section_h: data.section_h, section_i: data.section_i,
      section_j: data.section_j,
      district_scope: data.district_scope,
      ulb_scope: data.ulb_scope
    };

    if (data.projects) {
      for (const pid of data.projects) {
        await projectUserModel.addUserToProject(user.id, pid, projectRole, sections);
      }
      // Invalidate cache since user's projects have changed
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

    if (user.is_blocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact administration.' });
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

    // Invalidate cached project access on login to ensure fresh data
    invalidateProjectAccess(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        avatar_url: user.avatar_url
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
        avatar_url: user.avatar_url
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { projectId, global } = req.query;
    let users = [];
    
    if (global === 'true') {
      let isAuthorized = req.user.role === ROLES.MASTER_ADMIN;
      let callerProjectRole = null;
      if (!isAuthorized) {
        const memberProjects = await projectUserModel.getProjectsWithRoles(Number(req.user.sub));
        isAuthorized = memberProjects.some(p => p.section_d);
        // Determine the caller's highest project role for filtering
        if (isAuthorized) {
          const roleHierarchy = { ADMIN: 4, CLIENT: 3, EMPLOYEE: 2, MOBILE_USER: 1 };
          for (const p of memberProjects) {
            if (p.section_d) {
              const rank = roleHierarchy[p.project_role] || 0;
              if (!callerProjectRole || rank > (roleHierarchy[callerProjectRole] || 0)) {
                callerProjectRole = p.project_role;
              }
            }
          }
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Forbidden: You do not have team management access' });
      }
      
      // Filter based on caller's role
      if (callerProjectRole === ROLES.EMPLOYEE) {
        // Employee: only see MOBILE_USER in their projects
        const callerProjectIds = await projectUserModel.getProjectIds(Number(req.user.sub));
        users = await userService.listMobileUsersByProjects(callerProjectIds);
      } else if (callerProjectRole === ROLES.CLIENT) {
        // Client: see EMPLOYEE and MOBILE_USER across all projects they belong to
        const callerProjectIds = await projectUserModel.getProjectIds(Number(req.user.sub));
        const projectUsers = await userService.listUsersByProjects(callerProjectIds);
        users = projectUsers.filter(u => [ROLES.EMPLOYEE, ROLES.MOBILE_USER].includes(u.project_role));
      } else {
        // MASTER_ADMIN or ADMIN: see all
        users = await userService.listAllUsers();
      }
      
      const mappedUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role
      }));
      return res.json({ users: mappedUsers });
    }
    
    // For now, allow MASTER_ADMIN to see all, others only project specific
    if (req.user.role === ROLES.MASTER_ADMIN) {
      if (projectId) {
        users = await userService.listAllUsersWithProjectDetails(Number(projectId));
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
      // Check if user has section_d (Team Management) access
      if (!member.section_d) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to access team management' });
      }
      
      const projectRole = member.project_role;
      if (projectRole === ROLES.ADMIN) {
        // ADMIN project role: see all users globally with their current project-user mapping
        users = await userService.listAllUsersWithProjectDetails(Number(projectId));
      } else if (projectRole === ROLES.EMPLOYEE) {
        // EMPLOYEE project role: only see MOBILE_USER of this project
        const projectUsers = await userService.listUsersByProject(Number(projectId));
        users = projectUsers.filter(u => u.project_role === ROLES.MOBILE_USER);
      } else {
        // Other roles like CLIENT or MOBILE_USER: not authorized
        return res.status(403).json({ message: 'Forbidden' });
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

    const targetUser = await userService.findUserById(Number(id));
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Self-Lockout Protection
    if (Number(req.user.id) === Number(id) && data.is_blocked === true) {
      return res.status(403).json({ message: 'Forbidden: You cannot block yourself.' });
    }

    // MASTER_ADMIN Protection
    if (targetUser.role === 'MASTER_ADMIN' && data.is_blocked === true) {
      return res.status(403).json({ message: 'Forbidden: MASTER_ADMIN cannot be blocked.' });
    }

    const existingMember = await projectUserModel.isMember(Number(id), data.projectId);
    if (!existingMember) {
      return res.status(404).json({ message: 'User is not assigned to this project' });
    }
    
    // Authorization Check
    if (req.user.role !== ROLES.MASTER_ADMIN) {
      const membership = await projectUserModel.isMember(Number(req.user.sub), data.projectId);
      if (!membership) {
        return res.status(403).json({ message: 'Forbidden: You are not assigned to this project' });
      }

      // Requester must have section_d (Team Management) or section_h (Edit Access)
      if (!membership.section_d && !membership.section_h) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to manage team or edit access for this project' });
      }

      // Enforce project role hierarchy checks
      if (membership.project_role === ROLES.CLIENT) {
        return res.status(403).json({ message: 'Forbidden: Clients cannot manage users' });
      }
      if (membership.project_role === ROLES.EMPLOYEE && existingMember.project_role !== ROLES.MOBILE_USER) {
        return res.status(403).json({ message: 'Forbidden: Employees can only manage Mobile Users' });
      }

      // Check if they want to edit details (name, email, phone, blocked status)
      const wantsToEditDetails =
        (data.name !== undefined && data.name !== targetUser.name) ||
        (data.email !== undefined && data.email !== targetUser.email) ||
        (data.phone !== undefined && data.phone !== targetUser.phone) ||
        (data.is_blocked !== undefined && data.is_blocked !== targetUser.is_blocked);

      if (wantsToEditDetails && !membership.section_d) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to edit user details (requires Team Management access)' });
      }

      // Check if they want to edit permissions/scopes
      const sectionsList = ['section_a', 'section_b', 'section_c', 'section_d', 'section_e', 'section_f', 'section_g', 'section_h', 'section_i', 'section_j'];
      let wantsToEditPermissions = false;
      for (const sec of sectionsList) {
        if (data[sec] !== undefined && data[sec] !== existingMember[sec]) {
          wantsToEditPermissions = true;
          break;
        }
      }
      if (data.district_scope !== undefined && JSON.stringify(data.district_scope || []) !== JSON.stringify(existingMember.district_scope || [])) {
        wantsToEditPermissions = true;
      }
      if (data.ulb_scope !== undefined && JSON.stringify(data.ulb_scope || []) !== JSON.stringify(existingMember.ulb_scope || [])) {
        wantsToEditPermissions = true;
      }

      if (wantsToEditPermissions) {
        if (!membership.section_h) {
          return res.status(403).json({ message: 'Forbidden: You do not have permission to edit user permissions or scopes (requires Edit User Permissions access)' });
        }

        // Enforce permission inheritance
        for (const sec of sectionsList) {
          if (data[sec] === true && !membership[sec]) {
            return res.status(403).json({ message: `Forbidden: You cannot grant '${sec.replace('section_', 'section ')}' permission as you do not possess it.` });
          }
        }
      }
    }

    // Email collision check if email is modified
    if (data.email && data.email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()) {
      const collision = await userService.findUserByEmail(data.email);
      if (collision && collision.id !== Number(id)) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    // Update details in users table
    const updatedName = data.name !== undefined ? data.name : targetUser.name;
    const updatedEmail = data.email !== undefined ? data.email : targetUser.email;
    const updatedPhone = data.phone !== undefined ? data.phone : targetUser.phone;
    const updatedBlocked = data.is_blocked !== undefined ? data.is_blocked : targetUser.is_blocked;
    
    await userService.updateDetails(Number(id), updatedName, updatedEmail, updatedPhone, updatedBlocked);

    // Update project section/scopes access in project_users table
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
        section_j: data.section_j ?? existingMember.section_j,
        district_scope: data.district_scope !== undefined ? data.district_scope : existingMember.district_scope,
        ulb_scope: data.ulb_scope !== undefined ? data.ulb_scope : existingMember.ulb_scope
      }
    );

    // Invalidate cache since user's project access has changed
    invalidateProjectAccess(Number(id));

    await userService.touch(Number(id));

    return res.json({ message: 'Project access updated successfully' });
  } catch (error) {
    return next(error);
  }
}

async function getUserProjects(req, res, next) {
  try {
    const { id } = req.params;
    let isAuthorized = req.user.role === ROLES.MASTER_ADMIN;
    if (!isAuthorized) {
      const memberProjects = await projectUserModel.getProjectsWithRoles(Number(req.user.sub));
      isAuthorized = memberProjects.some(p => p.section_d);
    }
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view user projects' });
    }
    const assignments = await projectUserModel.getProjectsWithRoles(Number(id));
    return res.json({ assignments });
  } catch (error) {
    return next(error);
  }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

async function changePassword(req, res, next) {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = Number(req.user.sub);

    const user = await userService.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userWithPassword = await userService.findUserByEmail(user.email);
    if (!userWithPassword) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ok = await bcrypt.compare(data.currentPassword, userWithPassword.password);
    if (!ok) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await userService.changePassword(userId, passwordHash);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const storageProvider = require('../services/storage/storageProvider');
    const uploaded = await storageProvider.upload(req.file);
    
    // Get the old user object to delete their old avatar if it exists
    const user = await userService.findUserById(userId);
    if (user && user.avatar_url) {
      try {
        const oldFileKey = user.avatar_url.split('/').pop();
        await storageProvider.delete(oldFileKey);
      } catch (err) {
        console.error('Failed to delete old avatar:', err.message);
      }
    }

    // Update user's avatar_url in the database
    await userService.updateAvatar(userId, uploaded.url);
 
    return res.json({ 
      message: 'Profile picture uploaded successfully', 
      avatar_url: uploaded.url 
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return next(error);
  }
}
 
async function deleteAvatar(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const user = await userService.findUserById(userId);
    if (!user || !user.avatar_url) {
      return res.status(400).json({ message: 'No profile picture to delete' });
    }
 
    const storageProvider = require('../services/storage/storageProvider');
    try {
      const fileKey = user.avatar_url.split('/').pop();
      await storageProvider.delete(fileKey);
    } catch (err) {
      console.error('Failed to delete avatar from storage:', err.message);
    }
 
    await userService.updateAvatar(userId, null);
 
    return res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return next(error);
  }
}

const assignUserProjectsSchema = z.object({
  projectId: z.number().int().positive(),
  assigned: z.boolean(),
  project_role: z.string().trim().max(50).optional(),
  section_a: z.boolean().optional(),
  section_b: z.boolean().optional(),
  section_c: z.boolean().optional(),
  section_d: z.boolean().optional(),
  section_e: z.boolean().optional(),
  section_f: z.boolean().optional(),
  section_g: z.boolean().optional(),
  section_h: z.boolean().optional(),
  section_i: z.boolean().optional(),
  section_j: z.boolean().optional(),
  district_scope: z.array(z.number().int()).nullable().optional(),
  ulb_scope: z.array(z.number().int()).nullable().optional(),
});

async function assignUserProjects(req, res, next) {
  try {
    const { id } = req.params;
    const data = assignUserProjectsSchema.parse(req.body);
    const userId = Number(id);

    const targetUser = await userService.findUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role Hierarchy & Authorization
    const creatorRole = req.user.role; // MASTER_ADMIN or MEMBER
    if (creatorRole !== ROLES.MASTER_ADMIN) {
      // Requester must be a member of the target project and have section_d (Team Management)
      const creatorMembership = await projectUserModel.isMember(Number(req.user.sub), data.projectId);
      if (!creatorMembership) {
        return res.status(403).json({ message: `Forbidden: You do not have access to project ID ${data.projectId}` });
      }
      if (!creatorMembership.section_d) {
        return res.status(403).json({ message: `Forbidden: You do not have team management access for project ID ${data.projectId}` });
      }

      // Check hierarchy if assigning
      if (data.assigned) {
        const requestedRole = isKnownRole(data.project_role) ? normalizeRole(data.project_role) : ROLES.MOBILE_USER;
        if (creatorMembership.project_role === ROLES.CLIENT && ![ROLES.EMPLOYEE, ROLES.MOBILE_USER].includes(requestedRole)) {
          return res.status(403).json({ message: 'Forbidden: Clients can only assign Employee or Mobile User roles' });
        }
        if (creatorMembership.project_role === ROLES.EMPLOYEE && requestedRole !== ROLES.MOBILE_USER) {
          return res.status(403).json({ message: 'Forbidden: Employees can only assign Mobile Users' });
        }
        if (creatorMembership.project_role === ROLES.MOBILE_USER) {
          return res.status(403).json({ message: 'Forbidden: Mobile Users cannot assign users' });
        }

        // Check permission inheritance: cannot grant permissions the manager doesn't have
        const sectionsList = ['section_a', 'section_b', 'section_c', 'section_d', 'section_e', 'section_f', 'section_g', 'section_h', 'section_i', 'section_j'];
        for (const sec of sectionsList) {
          if (data[sec] === true && !creatorMembership[sec]) {
            return res.status(403).json({ message: `Forbidden: You cannot grant '${sec.replace('section_', 'section ')}' permission as you do not possess it.` });
          }
        }
      } else {
        // If unassigning, check if they can manage the user's role
        const targetMembership = await projectUserModel.isMember(userId, data.projectId);
        if (targetMembership) {
          if (creatorMembership.project_role === ROLES.EMPLOYEE && targetMembership.project_role !== ROLES.MOBILE_USER) {
            return res.status(403).json({ message: 'Forbidden: Employees can only unassign Mobile Users' });
          }
        }
      }
    }

    if (data.assigned) {
      const projectRole = isKnownRole(data.project_role) ? normalizeRole(data.project_role) : ROLES.MOBILE_USER;
      const sections = {
        section_a: data.section_a, section_b: data.section_b, section_c: data.section_c,
        section_d: data.section_d, section_e: data.section_e, section_f: data.section_f,
        section_g: data.section_g, section_h: data.section_h, section_i: data.section_i,
        section_j: data.section_j,
        district_scope: data.district_scope,
        ulb_scope: data.ulb_scope
      };
      await projectUserModel.addUserToProject(userId, data.projectId, projectRole, sections);
    } else {
      await projectUserModel.removeUserFromProject(userId, data.projectId);
    }

    // Invalidate project access cached values
    invalidateProjectAccess(userId);
    await userService.touch(userId);

    return res.json({ message: 'User project assignment updated successfully' });
  } catch (error) {
    console.error('Error in assignUserProjects:', error);
    return next(error);
  }
}
 
module.exports = { register, login, me, listUsers, getUserProjects, updateAccess, changePassword, uploadAvatar, deleteAvatar, assignUserProjects };
