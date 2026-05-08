import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const CreateAdminModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'ADMIN',
    projects: [],
    section_a: false,
    section_b: false,
    section_c: false,
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://127.0.0.1:3000/api/v1/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.projects || [];
    },
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
    const token = localStorage.getItem('token');
    try {
      // 1. Create User
      const res = await axios.post('http://127.0.0.1:3000/api/v1/auth/register', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Admin created:', res.data);
      onClose();
    } catch (error) {
      console.error('Error creating admin:', error);
      alert(error.response?.data?.message || 'Error creating admin');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Create Admin</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Assign Projects</label>
            <div className="space-y-1 max-h-24 overflow-y-auto border border-gray-100 p-2 rounded">
              {projects.length === 0 ? (
                <p className="text-xs text-gray-500">No projects found.</p>
              ) : (
                projects.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.projects.includes(p.id)} onChange={() => handleProjectChange(p.id)} className="rounded text-primary focus:ring-primary" />
                    <span>{p.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Section Access</label>
            <div className="flex gap-4 p-2 border border-gray-100 rounded">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_a" checked={formData.section_a} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section A</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_b" checked={formData.section_b} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section B</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="section_c" checked={formData.section_c} onChange={handleChange} className="rounded text-primary focus:ring-primary" />
                <span>Section C</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors">Create Admin</button>
          </div>
        </form>
      </div>
    </div>
  );
};
