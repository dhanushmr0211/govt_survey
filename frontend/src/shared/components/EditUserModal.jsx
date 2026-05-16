import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export const EditUserModal = ({ isOpen, onClose, user, projectId, onSave }) => {
  const [formData, setFormData] = useState({
    section_a: false,
    section_b: false,
    section_c: false,
    section_d: false,
    section_e: false,
    section_f: false,
    section_g: false,
    section_h: false,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        section_a: user.section_a || false,
        section_b: user.section_b || false,
        section_c: user.section_c || false,
        section_d: user.section_d || false,
        section_e: user.section_e || false,
        section_f: user.section_f || false,
        section_g: user.section_g || false,
        section_h: user.section_h || false,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) {
      alert('Project context is missing. Cannot update access.');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_BASE_URL}/auth/users/${user.id}/access`, {
        ...formData,
        projectId: Number(projectId)
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating access:', error);
      alert(error.response?.data?.message || 'Error updating access');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Edit Permissions</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Editing Access For</p>
          <p className="text-sm font-semibold text-slate-700">{user?.name} ({user?.email})</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-slate-700 font-semibold mb-3">Project Section Access</label>
            <div className="grid grid-cols-1 gap-2 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
              {[
                { id: 'section_a', label: 'Section A: Summary & Dashboard' },
                { id: 'section_b', label: "Section B: Today's Summary" },
                { id: 'section_c', label: 'Section C: Issues & Approval' },
                { id: 'section_d', label: 'Section D: Team Management' },
                { id: 'section_e', label: 'Section E: Employee Tracking' },
                { id: 'section_f', label: 'Section F: Mobile User Tracking' },
                { id: 'section_g', label: 'Section G: Download Reports' },
                { id: 'section_h', label: 'Section H: Edit User Permissions' },
              ].map(sec => (
                <label key={sec.id} className="flex items-center gap-3 cursor-pointer py-2 px-3 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100">
                  <input type="checkbox" name={sec.id} checked={formData[sec.id]} onChange={handleChange} className="rounded text-primary focus:ring-primary w-4 h-4" />
                  <span className="text-slate-600 font-medium">{sec.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all">Save Permissions</button>
          </div>
        </form>
      </div>
    </div>
  );
};
