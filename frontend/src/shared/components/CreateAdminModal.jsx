import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import API_BASE_URL from '../../config/api';
import { useProjects } from '../hooks/useProjects';
 
export const CreateAdminModal = ({ isOpen, onClose, defaultProjectId, fixedRole }) => {
  const { user: loggedInUser, activeProject } = useAuthStore();
  // Determine the caller's project role
  const callerProjectRole = activeProject?.project_role;
  
  // Determine which roles can be created
  const getAllowedRoles = () => {
    if (fixedRole) return [fixedRole];
    if (loggedInUser?.role === 'MASTER_ADMIN') return ['ADMIN', 'CLIENT', 'EMPLOYEE', 'MOBILE_USER'];
    if (callerProjectRole === 'ADMIN') return ['EMPLOYEE', 'CLIENT', 'MOBILE_USER'];
    if (callerProjectRole === 'CLIENT') return ['EMPLOYEE', 'MOBILE_USER'];
    if (callerProjectRole === 'EMPLOYEE') return ['MOBILE_USER'];
    return ['MOBILE_USER'];
  };
  const allowedRoles = getAllowedRoles();
  
  const targetRole = fixedRole || allowedRoles[0];
  const getRoleName = (role) => {
    const map = { ADMIN: 'Admin', CLIENT: 'Client', EMPLOYEE: 'Employee', MOBILE_USER: 'Mobile User' };
    return map[role] || role;
  };
  const targetRoleName = getRoleName(targetRole);
 
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    project_role: targetRole,
    projects: defaultProjectId ? [Number(defaultProjectId)] : (activeProject ? [activeProject.id] : []),
    section_a: false,
    section_b: false,
    section_c: false,
    section_d: false,
    section_e: false,
    section_f: false,
    section_g: false,
    section_h: false,
    section_i: false,
    section_j: false
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
 
  // Fetch global users list
  const token = localStorage.getItem('token');
  const { data: globalUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['globalUsers'],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/auth/users?global=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.users || [];
    },
    enabled: isOpen
  });
 
  // Fetch projects
  const { data: projects = [], isLoading: loadingProjects } = useProjects();

  // Reset form states when modal is closed/opened
  useEffect(() => {
    if (!isOpen) {
      handleClearUser();
    }
  }, [isOpen]);
 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
 
  const handleProjectChange = (projectId) => {
    setFormData((prev) => {
      const projects = prev.projects.includes(projectId)
        ? prev.projects.filter((id) => id !== projectId)
        : [...prev.projects, projectId];
      return { ...prev, projects };
    });
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setDropdownOpen(false);
    
    // Auto fill details
    setFormData(prev => ({
      ...prev,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '', // No password needed for existing user
    }));

    try {
      const res = await axios.get(`${API_BASE_URL}/auth/users/${user.id}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignments = res.data.assignments || [];
      const projectIds = assignments.map(a => a.id);
      setAssignedProjectIds(projectIds);

      // Check if user is already assigned to the present project
      const currentPid = Number(defaultProjectId || activeProject?.id);
      const presentAssignment = assignments.find(a => a.id === currentPid);
      
      setFormData(prev => {
        const updatedProjects = presentAssignment 
          ? (prev.projects.includes(currentPid) ? prev.projects : [...prev.projects, currentPid])
          : prev.projects.filter(id => id !== currentPid);
          
        return {
          ...prev,
          projects: updatedProjects,
          project_role: presentAssignment ? presentAssignment.project_role : targetRole,
          section_a: presentAssignment ? presentAssignment.section_a : false,
          section_b: presentAssignment ? presentAssignment.section_b : false,
          section_c: presentAssignment ? presentAssignment.section_c : false,
          section_d: presentAssignment ? presentAssignment.section_d : false,
          section_e: presentAssignment ? presentAssignment.section_e : false,
          section_f: presentAssignment ? presentAssignment.section_f : false,
          section_g: presentAssignment ? presentAssignment.section_g : false,
          section_h: presentAssignment ? presentAssignment.section_h : false,
          section_i: presentAssignment ? presentAssignment.section_i : false,
          section_j: presentAssignment ? presentAssignment.section_j : false
        };
      });
    } catch (err) {
      console.error('Error fetching user projects:', err);
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setAssignedProjectIds([]);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: 'password123',
      project_role: targetRole,
      projects: defaultProjectId ? [Number(defaultProjectId)] : (activeProject ? [activeProject.id] : []),
      section_a: false,
      section_b: false,
      section_c: false,
      section_d: false,
      section_e: false,
      section_f: false,
      section_g: false,
      section_h: false,
      section_i: false,
      section_j: false
    });
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedUser) {
      const currentPid = Number(defaultProjectId || activeProject?.id);
      const isAssignedToPresent = formData.projects.includes(currentPid);
      
      const payload = {
        projectId: currentPid,
        assigned: isAssignedToPresent,
        project_role: formData.project_role,
        section_a: formData.section_a,
        section_b: formData.section_b,
        section_c: formData.section_c,
        section_d: formData.section_d,
        section_e: formData.section_e,
        section_f: formData.section_f,
        section_g: formData.section_g,
        section_h: formData.section_h,
        section_i: formData.section_i,
        section_j: formData.section_j
      };
      
      try {
        await axios.post(`${API_BASE_URL}/auth/users/${selectedUser.id}/projects`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onClose();
      } catch (error) {
        console.error('Error assigning user to project:', error);
        alert(error.response?.data?.message || 'Error assigning user to project');
      }
    } else {
      if (!formData.projects || formData.projects.length === 0) {
        alert('Please assign at least one project to the user.');
        return;
      }
 
      try {
        await axios.post(`${API_BASE_URL}/auth/register`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onClose();
      } catch (error) {
        console.error('Error creating user:', error);
        alert(error.response?.data?.message || 'Error creating user');
      }
    }
  };
 
  if (!isOpen) return null;

  // Filter global users based on search text
  const filteredUsers = searchQuery.trim() === ''
    ? []
    : globalUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
 
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Create {targetRoleName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Global User Selection Dropdown */}
          <div className="relative">
            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Selected Existing User</span>
                  <span className="text-sm font-semibold text-emerald-950">{selectedUser.name}</span>
                  <span className="text-xs text-emerald-700/80">{selectedUser.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearUser}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded transition-colors"
                >
                  Clear / New
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Search Existing User (Optional)</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-slate-900"
                  placeholder="Type name or email to search..."
                />
                {dropdownOpen && searchQuery && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-slate-500 text-xs font-semibold">No users found. Enter details below to add from scratch.</div>
                    ) : (
                      filteredUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-100/80 transition-colors text-slate-700 hover:text-slate-950 border-b border-slate-50 last:border-b-0 flex flex-col"
                        >
                          <span className="font-bold text-sm">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email} {u.phone ? `(${u.phone})` : ''}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                readOnly={!!selectedUser}
                className={`w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${selectedUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} 
                placeholder="John Doe" 
                required 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                readOnly={!!selectedUser}
                className={`w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${selectedUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} 
                placeholder="john@example.com" 
                required 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                readOnly={!!selectedUser}
                className={`w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${selectedUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} 
                placeholder="+91 00000 00000" 
              />
            </div>
          </div>
 
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Project Role</label>
            <select 
              name="project_role" 
              value={formData.project_role} 
              onChange={handleChange} 
              disabled={!!fixedRole || allowedRoles.length === 1}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50 disabled:opacity-75"
            >
              {allowedRoles.map(role => (
                <option key={role} value={role}>{getRoleName(role)}</option>
              ))}
            </select>
          </div>
 
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Assign Projects</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-100 p-3 rounded-lg bg-slate-50">
              {loadingProjects ? (
                <p className="text-xs text-primary animate-pulse font-medium">Loading projects list...</p>
              ) : (!projects || !Array.isArray(projects) || projects.length === 0) ? (
                <p className="text-xs text-slate-500">No projects available.</p>
              ) : (
                projects.map((p) => {
                  const currentPid = Number(defaultProjectId || activeProject?.id);
                  const isPresentProject = p.id === currentPid;
                  const isAssignedToOtherProject = assignedProjectIds.includes(p.id) && !isPresentProject;
                  
                  const isChecked = isPresentProject ? formData.projects.includes(p.id) : isAssignedToOtherProject;
                  const isDisabled = !!selectedUser && !isPresentProject;

                  return (
                    <label key={p.id} className={`flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-100/50 rounded px-1 transition-colors ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={isDisabled}
                        onChange={() => handleProjectChange(p.id)} 
                        className="rounded text-primary focus:ring-primary disabled:opacity-60" 
                      />
                      <span className="text-slate-700 font-medium">{p.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
 
          {formData.projects.length > 0 && formData.project_role !== 'MOBILE_USER' && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Section Permissions</label>
              <div className="grid grid-cols-2 gap-2 p-3 border border-slate-100 rounded-lg bg-slate-50">
                {[
                  { id: 'section_a', label: 'Summary' },
                  { id: 'section_b', label: 'Today Summary' },
                  { id: 'section_c', label: 'Issues' },
                  { id: 'section_d', label: 'Users' },
                  { id: 'section_e', label: 'Emp Tracking' },
                  { id: 'section_f', label: 'User Tracking' },
                  { id: 'section_g', label: 'Download Reports' },
                  { id: 'section_h', label: 'Edit User Permissions' },
                  { id: 'section_i', label: 'Edit Survey Data (Images/Records)' },
                  { id: 'section_j', label: 'Edit Confirmed Data' },
                ].map(sec => {
                  const allowed = loggedInUser?.role === 'MASTER_ADMIN' || !!activeProject?.[sec.id];
                  return (
                    <label key={sec.id} className={`flex items-center gap-2 cursor-pointer py-1 ${!allowed ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <input 
                        type="checkbox" 
                        name={sec.id} 
                        checked={formData[sec.id]} 
                        onChange={handleChange} 
                        disabled={!allowed}
                        className="rounded text-primary focus:ring-primary disabled:opacity-50" 
                      />
                      <span className="text-xs text-slate-600 font-medium">{sec.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
 
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">
              {selectedUser ? 'Save Assignment' : `Create ${getRoleName(formData.project_role)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
