import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import API_BASE_URL from '../../config/api';

export const CreateAdminModal = ({ isOpen, onClose }) => {
  const { user: loggedInUser, activeProject } = useAuthStore();
  
  const targetRole = loggedInUser?.role === 'MASTER_ADMIN' ? 'ADMIN' : loggedInUser?.role === 'ADMIN' ? 'EMPLOYEE' : 'MOBILE_USER';
  const targetRoleName = (loggedInUser?.role === 'MASTER_ADMIN' || loggedInUser?.role === 'ADMIN') ? 'User' : 'Mobile User';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    project_role: targetRole,
    projects: activeProject ? [activeProject.id] : [],
    section_a: false,
    section_b: false,
    section_c: false,
    section_d: false,
    section_e: false,
    section_f: false,
    section_g: false,
    section_h: false,
  });


  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.projects || [];
    },
    enabled: isOpen,
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.projects || formData.projects.length === 0) {
      alert('Please assign at least one project to the user.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      // 1. Create User
      // Note: Backend expects project_role and projects
      await axios.post(`${API_BASE_URL}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.message || 'Error creating user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Create {targetRoleName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="John Doe" required />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="john@example.com" required />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="+91 00000 00000" />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Project Role</label>
            <select name="project_role" value={formData.project_role} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50">
              {loggedInUser?.role === 'MASTER_ADMIN' && (
                <>
                  <option value="ADMIN">Admin</option>
                  <option value="CLIENT">Client</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MOBILE_USER">Mobile User</option>
                </>
              )}
              {loggedInUser?.role === 'MEMBER' && (
                <>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="CLIENT">Client</option>
                  <option value="MOBILE_USER">Mobile User</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Assign Projects</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-100 p-3 rounded-lg bg-slate-50">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-500">No projects available.</p>
              ) : (
                projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-100/50 rounded px-1 transition-colors">
                    <input type="checkbox" checked={formData.projects.includes(p.id)} onChange={() => handleProjectChange(p.id)} className="rounded text-primary focus:ring-primary" />
                    <span className="text-slate-700 font-medium">{p.name}</span>
                  </label>
                ))
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
                  { id: 'section_g', label: 'Report DL' },
                  { id: 'section_h', label: 'Edit Access' },
                ].map(sec => (
                  <label key={sec.id} className="flex items-center gap-2 cursor-pointer py-1">
                    <input type="checkbox" name={sec.id} checked={formData[sec.id]} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                    <span className="text-xs text-slate-600 font-medium">{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">Create {targetRoleName}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
